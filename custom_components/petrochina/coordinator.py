"""Data coordinator for the Oil Price integration."""
import asyncio
import logging
import re
from datetime import timedelta

import aiohttp
import async_timeout
from bs4 import BeautifulSoup
import requests

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import (
    DOMAIN, 
    CONF_UPDATE_INTERVAL,
    OIL_API_URL,
)

_LOGGER = logging.getLogger(__name__)
URL = "http://www.qiyoujiage.com/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1"
}

class OilPriceDataCoordinator(DataUpdateCoordinator):
    """Class to manage fetching oil price data."""

    def __init__(self, hass: HomeAssistant, update_interval: int, province: str):
        """Initialize."""
        self.hass = hass
        self.url = URL
        self.province = province

        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(hours=update_interval),
        )
        
    def _convert_to_number(self, value):
        """将字符串油价转换为数值格式。"""
        if isinstance(value, (int, float)):
            return value
            
        if isinstance(value, str):
            try:
                # 移除可能的单位和其他非数字字符
                cleaned_value = re.sub(r'[^\d.]', '', value)
                if cleaned_value:
                    return float(cleaned_value)
            except (ValueError, TypeError):
                pass
                
        return value  # 如果无法转换，返回原始值

    async def _async_update_data(self):
        """Update data via library."""
        try:
            async with async_timeout.timeout(10):
                return await self.hass.async_add_executor_job(self._fetch_data)
        except (asyncio.TimeoutError, aiohttp.ClientError) as error:
            raise UpdateFailed(f"Error communicating with API: {error}")

    def _fetch_data(self):
        """Fetch data from website and API."""
        oil_data = {}
        
        # 首先从API获取省份油价数据
        try:
            api_response = requests.get(OIL_API_URL, timeout=10)
            api_response.raise_for_status()
            api_data = api_response.json()
            
            if api_data.get("code") == 200 and "data" in api_data:
                # 匹配用户输入的城市名称（支持带或不带“省”字）
                province_data = None
                for item in api_data["data"]:
                    if self.province in item["regionName"] or self.province.replace("省", "") in item["regionName"]:
                        province_data = item
                        break
                
                if province_data:
                    # 保存省份信息
                    oil_data["省份"] = province_data.get("regionName", self.province)
                    
                    # 保存各类油价，转换为数值格式
                    oil_data["柴油"] = self._convert_to_number(province_data.get("n0", "暂无数据"))
                    oil_data["89#汽油"] = self._convert_to_number(province_data.get("n89", "暂无数据"))
                    oil_data["92#汽油"] = self._convert_to_number(province_data.get("n92", "暂无数据"))
                    oil_data["95#汽油"] = self._convert_to_number(province_data.get("n95", "暂无数据"))
                    oil_data["98#汽油"] = self._convert_to_number(province_data.get("n98", "暂无数据"))
                
                _LOGGER.info(f"成功获取{self.province}油价数据")
            else:
                _LOGGER.error(f"API返回错误: {api_data.get('msg', '未知错误')}")
        except requests.RequestException as error:
            _LOGGER.error(f"获取API数据失败: {error}")
        
        # 然后获取全国油价趋势信息
        try:
            response = requests.get(self.url, headers=HEADERS, timeout=10)
            response.raise_for_status()
            
            # 设置编码为 UTF-8
            response.encoding = 'utf-8'
            
            soup = BeautifulSoup(response.text, 'html.parser')
            left_div = soup.find('div', id='left')
            
            if not left_div:
                _LOGGER.error("Could not find div with id 'left'")
                return oil_data  # 返回已有的API数据
            
            # 提取所有文本内容
            text_content = left_div.get_text(strip=True, separator="\n")
            
            # 移除"备注："及其后面的内容
            if "备注：" in text_content:
                text_content = text_content.split("备注：")[0].strip()
            
            # 趋势信息提取
            trend_text = soup.get_text()
            info_parts = []
            
            # 提取调整日期（支持"下次油价..."和"油价..."两种格式）
            if adjustment := re.search(r'(下次油价|油价).*?(\d+月\d+日24时)调整', trend_text):
                info_parts.append(adjustment.group(0))
                # 保存下次调整时间到数据字典
                oil_data["下次调整时间"] = f"{adjustment.group(2)}"
            
            # 提取调价幅度（支持"目前预计上调/下调油价X元/吨"和"下跌X元/升-X元/升"两种格式）
            if change := re.search(r'目前预计(上调|下调)油价(\d+)元/吨', trend_text):
                info_parts.append(change.group(0))
                # 保存调价信息到数据字典
                oil_data["下次调整价格"] = f"{change.group(1)}油价{change.group(2)}元/吨"
            elif change := re.search(r'(下跌|上涨)([\d\.]+)元/升-([\d\.]+)元/升', trend_text):
                info_parts.append(change.group(0))
                # 保存调价信息到数据字典
                oil_data["下次调整价格"] = f"{change.group(1)}{change.group(2)}-{change.group(3)}元/升"
            
            # 提取备注信息
            if note := re.search(r'大家相互转告([^。]+)', trend_text):
                info_parts.append(note.group(0))
                # 保存油价趋势到数据字典
                oil_data["油价趋势"] = f"大家相互转告{note.group(1)}"
            
            # 设置信息和原始内容
            oil_data["info"] = " ".join(info_parts) if info_parts else f"{self.province}油价信息"
            oil_data["原始内容"] = text_content
            
        except requests.RequestException as error:
            _LOGGER.error(f"获取趋势数据失败: {error}")
            # 如果趋势获取失败但API成功，仍然返回API数据
            if not oil_data.get("info"):
                oil_data["info"] = f"{self.province}油价信息"
        
        return oil_data
