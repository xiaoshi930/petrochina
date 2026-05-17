"""Data coordinator for the Oil Price integration."""
import asyncio
import logging
import re
import json
import os
from datetime import timedelta, datetime

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
URL = "https://www.youjiatong.com/tiaozheng.html"
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
        self.cache_file = os.path.join(hass.config.config_dir, f"{DOMAIN}_{province}_cache.json")

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

    def _load_cache(self):
        """从缓存文件加载数据。"""
        try:
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                    
                # 检查缓存是否过期（24小时内）
                cache_time = datetime.fromisoformat(cache_data.get('timestamp', '1970-01-01'))
                if datetime.now() - cache_time < timedelta(hours=24):
                    return cache_data.get('data', {})
                else:
                    _LOGGER.error(f"{self.province}的缓存数据已过期")
        except (json.JSONDecodeError, KeyError, ValueError) as error:
            _LOGGER.error(f"读取缓存文件失败: {error}")
        
        return None

    def _save_cache(self, data):
        """保存数据到缓存文件。"""
        try:
            cache_data = {
                'timestamp': datetime.now().isoformat(),
                'data': data
            }
            
            # 确保目录存在
            os.makedirs(os.path.dirname(self.cache_file), exist_ok=True)
            
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, ensure_ascii=False, indent=2)
                
        except (IOError, OSError) as error:
            _LOGGER.error(f"保存缓存文件失败: {error}")

    async def _async_update_data(self):
        """Update data via library."""
        try:
            async with async_timeout.timeout(10):
                data = await self.hass.async_add_executor_job(self._fetch_data)
                
                # 如果成功获取数据，保存到缓存
                if data and data.get("省份"):
                    # 在异步上下文中安全地保存缓存
                    await self.hass.async_add_executor_job(self._save_cache, data)
                    return data
                else:
                    # 如果获取的数据不完整，尝试使用缓存
                    cached_data = self._load_cache()
                    if cached_data:
                        return cached_data
                    else:
                        raise UpdateFailed("获取数据不完整且无可用缓存")
                        
        except (asyncio.TimeoutError, aiohttp.ClientError) as error:
            _LOGGER.warning(f"API访问失败，尝试使用缓存数据: {error}")
            
            # API访问失败时，尝试使用缓存数据
            cached_data = self._load_cache()
            if cached_data:
                return cached_data
            else:
                raise UpdateFailed(f"API访问失败且无可用缓存: {error}")

    def _fetch_data(self):
        """Fetch data from website and API."""
        oil_data = {}
        
        # 首先从API获取省份油价数据
        try:
            api_response = requests.get(OIL_API_URL, timeout=10)
            api_response.raise_for_status()
            api_data = api_response.json()
            
            if api_data.get("code") == 200 and "data" in api_data:
                # 匹配用户输入的城市名称（支持带或不带"省"字）
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
                
                # 保存所有省份数据用于排序显示
                all_provinces_data = []
                for item in api_data["data"]:
                    province_name = item.get("regionName", "")
                    n0 = self._convert_to_number(item.get("n0", 0))   # 柴油
                    n89 = self._convert_to_number(item.get("n89", 0))
                    n92 = self._convert_to_number(item.get("n92", 0))
                    n95 = self._convert_to_number(item.get("n95", 0))
                    n98 = self._convert_to_number(item.get("n98", 0))
                    
                    # 计算92+95平均值（只用于排序，不显示）
                    if isinstance(n92, (int, float)) and isinstance(n95, (int, float)):
                        avg_price = (n92 + n95) / 2
                    else:
                        avg_price = None
                    
                    all_provinces_data.append({
                        "省份": province_name,
                        "柴油": n0,
                        "89#汽油": n89,
                        "92#汽油": n92,
                        "95#汽油": n95,
                        "98#汽油": n98,
                        "均价排序": avg_price
                    })
                
                oil_data["全国油价数据"] = all_provinces_data
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
            trend_text = soup.get_text()
            
            # 提取当前调整信息
            # 格式：2026年5月8日24时油价调整，本轮油价调整为：汽油上调320元/吨...
            if current_match := re.search(r'(\d{4}年)(\d{1,2}月)(\d{1,2}日)(\d{2}时)油价调整，本轮油价调整为：(.+?)，下一轮油价调整窗口时间：(\d{4}年)(\d{1,2}月)(\d{1,2}日)(\d{2}时)', trend_text):
                # 格式化本轮时间
                year = current_match.group(1).replace("年", "")
                month = current_match.group(2).replace("月", "").zfill(2)
                day = current_match.group(3).replace("日", "").zfill(2)
                current_date = f"{year}-{month}-{day}"
                
                # 格式化下轮时间
                next_year = current_match.group(6).replace("年", "")
                next_month = current_match.group(7).replace("月", "").zfill(2)
                next_day = current_match.group(8).replace("日", "").zfill(2)
                next_date = f"{next_year}-{next_month}-{next_day}"
                
                # 解析本轮调整价格，生成字典格式
                current_price_raw = current_match.group(5).strip()
                price_dict = {}
                
                # 1. 先匹配92号、95号、98号汽油和0号柴油等具体标号（元/升）
                for match in re.finditer(r'(92号汽油|95号汽油|98号汽油|0号柴油)(上调|下调)(\d+\.?\d*)元/升', current_price_raw):
                    oil_type = match.group(1)
                    change_type = match.group(2)
                    price_val = match.group(3)
                    price_dict[oil_type] = f"{change_type}{price_val}元/升"
                
                # 2. 再匹配汽、柴油整体调整（元/吨），避免被具体标号覆盖
                for match in re.finditer(r'(汽油|柴油)(上调|下调)(\d+\.?\d*)元/吨', current_price_raw):
                    oil_type = match.group(1)
                    change_type = match.group(2)
                    price_val = match.group(3)
                    price_dict[oil_type] = f"{change_type}{price_val}元/吨"
                
                oil_data["本轮调整时间"] = current_date
                oil_data["本轮调整价格"] = price_dict
                oil_data["下轮调整时间"] = next_date
                oil_data["下轮调整价格"] = "暂无"

            # 提取2026年调整日历
            calendar = {}
            normalized_text = re.sub(r'<(br|p|div)[^>]*>\s*', '\n', trend_text, flags=re.IGNORECASE)
            normalized_text = re.sub(r'<[^>]+>', ' ', normalized_text)
            
            # 查找2026年日历表区域
            year_pattern = r'2026\s*年\s*油\s*价\s*调\s*整\s*日\s*历\s*表'
            year_match = re.search(year_pattern, normalized_text)
            if year_match:
                start_pos = year_match.start()
                # 查找下一个年份标题或页脚
                next_year_match = re.search(r'20\d{2}\s*年\s*油\s*价\s*调\s*整\s*日\s*历\s*表', normalized_text[start_pos + 10:])
                if next_year_match:
                    end_pos = start_pos + 10 + next_year_match.start()
                else:
                    footer_match = re.search(r'油\s*价\s*通|备\s*案\s*号|风\s*险\s*自\s*负', normalized_text[start_pos:])
                    end_pos = start_pos + footer_match.start() if footer_match else len(normalized_text)
                
                year_content = normalized_text[start_pos:end_pos]
                
                # 解析2026年日期
                year_data = {}
                dates_dict = {}
                
                # 提取全年累计
                total_match = re.search(r'全年累计[：:\s]+(.+?)(?=\d{1,2}月\d{1,2}日24时|$)', year_content, re.DOTALL)
                if total_match:
                    year_data["全年累计"] = re.sub(r'\s+', ' ', total_match.group(1).strip())
                
                # 按行分割处理日期
                lines = year_content.split('\n')
                for i, line in enumerate(lines):
                    line = line.strip()
                    date_match = re.match(r'(\d{1,2}月)(\d{1,2}日)24时', line)
                    if date_match:
                        month = date_match.group(1).replace("月", "").zfill(2)
                        day = date_match.group(2).replace("日", "").zfill(2)
                        date_str = f"2026-{month}-{day}"
                        
                        # 跳过空行，查找下一行有效内容
                        content = ""
                        for j in range(i + 1, len(lines)):
                            next_line = lines[j].strip()
                            if next_line:
                                if re.match(r'\d{1,2}月\d{1,2}日24时', next_line):
                                    break
                                content = next_line
                                break
                        
                        # 根据内容判断
                        if not content:
                            dates_dict[date_str] = "待定"
                        elif "不作调整" in content:
                            dates_dict[date_str] = "不作调整"
                        elif "约" in content and "元/升" in content:
                            price_match = re.search(r'约([\d.]+)元/升', content)
                            if price_match:
                                price_val = price_match.group(1)
                                if "上调" in content:
                                    dates_dict[date_str] = f"上调约{price_val}元/升"
                                elif "下调" in content:
                                    dates_dict[date_str] = f"下调约{price_val}元/升"
                                else:
                                    dates_dict[date_str] = "待定"
                            else:
                                dates_dict[date_str] = "待定"
                        else:
                            dates_dict[date_str] = "待定"
                
                if dates_dict:
                    year_data["日期"] = dates_dict
                    calendar["2026"] = year_data
            
            # 添加2025年固定数据
            calendar["2025"] = {
                "全年累计": "汽、柴油分别下调915、880元/吨（约为0.71元/升）",
                "日期": {
                    "2025-01-02": "上调约0.05元/升",
                    "2025-01-16": "上调约0.27元/升",
                    "2025-02-06": "不作调整",
                    "2025-02-19": "下调约0.14元/升",
                    "2025-03-05": "下调约0.12元/升",
                    "2025-03-19": "下调约0.23元/升",
                    "2025-04-02": "上调约0.18元/升",
                    "2025-04-17": "下调约0.38元/升",
                    "2025-04-30": "不作调整",
                    "2025-05-19": "下调约0.18元/升",
                    "2025-06-03": "上调约0.05元/升",
                    "2025-06-17": "上调约0.21元/升",
                    "2025-07-01": "上调约0.19元/升",
                    "2025-07-15": "下调约0.10元/升",
                    "2025-07-29": "不作调整",
                    "2025-08-12": "不作调整",
                    "2025-08-26": "下调约0.14元/升",
                    "2025-09-09": "不作调整",
                    "2025-09-23": "不作调整",
                    "2025-10-13": "下调约0.05元/升",
                    "2025-10-27": "下调约0.21元/升",
                    "2025-11-10": "上调约0.1元/升",
                    "2025-11-24": "下调约0.06元/升",
                    "2025-12-08": "下调约0.05元/升",
                    "2025-12-22": "下调约0.14元/升"
                }
            }
            
            # 添加2024年固定数据
            calendar["2024"] = {
                "全年累计": "汽、柴油分别降低580、570元/吨（约为0.44元/升）",
                "日期": {
                    "2024-01-03": "上调约0.16元/升",
                    "2024-01-17": "下调约0.04元/升",
                    "2024-01-31": "上调约0.16元/升",
                    "2024-02-19": "不作调整",
                    "2024-03-04": "上调约0.12元/升",
                    "2024-03-18": "不作调整",
                    "2024-04-01": "上调约0.16元/升",
                    "2024-04-16": "上调约0.16元/升",
                    "2024-04-29": "下调约0.05元/升",
                    "2024-05-15": "下调约0.18元/升",
                    "2024-05-29": "不作调整",
                    "2024-06-13": "下调约0.15元/升",
                    "2024-06-27": "上调约0.17元/升",
                    "2024-07-11": "上调约0.08元/升",
                    "2024-07-25": "下调约0.12元/升",
                    "2024-08-08": "下调约0.24元/升",
                    "2024-08-22": "不作调整",
                    "2024-09-05": "下调约0.08元/升",
                    "2024-09-20": "下调约0.29元/升",
                    "2024-10-10": "上调约0.11元/升",
                    "2024-10-23": "上调约0.07元/升",
                    "2024-11-06": "下调约0.12元/升",
                    "2024-11-20": "不作调整",
                    "2024-12-04": "不作调整",
                    "2024-12-18": "不作调整"
                }
            }
            
            oil_data["调整日历"] = calendar
            
            # 构建info显示内容
            info_parts = []
            if oil_data.get("下轮调整时间"):
                info_parts.append(f"下次: {oil_data['下轮调整时间']}")
            
            oil_data["info"] = " ".join(info_parts) if info_parts else f"{self.province}油价信息"
            
            
        except requests.RequestException as error:
            _LOGGER.error(f"获取趋势数据失败: {error}")
            # 如果趋势获取失败但API成功，仍然返回API数据
            if not oil_data.get("info"):
                oil_data["info"] = f"{self.province}油价信息"
        
        return oil_data
