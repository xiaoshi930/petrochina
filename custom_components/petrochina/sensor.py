"""Sensor platform for the Oil Price integration."""
from __future__ import annotations

import logging
import re
from typing import Any, Callable, Dict, Optional

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.typing import StateType
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.helpers.device_registry import DeviceInfo

from .const import (
    CONF_UPDATE_INTERVAL,
    DEFAULT_UPDATE_INTERVAL,
    DOMAIN,
    CONF_PROVINCE,
    VALID_PROVINCES,
    VALID_PROVINCES_PINYIN
)
from .coordinator import OilPriceDataCoordinator

_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the Oil Price sensor."""
    coordinator = hass.data[DOMAIN][entry.entry_id]
    province = entry.data.get(CONF_PROVINCE)
    
    # 添加油价传感器
    async_add_entities([OilPriceSensor(coordinator, province)])

class OilPriceSensor(CoordinatorEntity, SensorEntity):
    """Representation of an Oil Price sensor."""

    def __init__(self, coordinator: OilPriceDataCoordinator, province: str) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._province = province
        try:
            index = VALID_PROVINCES.index(province)
            province_pinyin = VALID_PROVINCES_PINYIN[index]
            self.entity_id = f"sensor.fuel_price_{province_pinyin}"
            self._attr_device_info = DeviceInfo(
                identifiers={(DOMAIN, f"fuel_price_{province_pinyin}")},
                name=f"中国油价 - {province}",
                manufacturer="Fuel Price Integration",
            )
            self._attr_name = f"{province}油价"
            self._attr_icon = "mdi:gas-station"
            self._attr_unique_id = f"fuel_price_{province_pinyin}"
        except ValueError:
            _LOGGER.error("Invalid province: %s", province)
            raise
        
    @property
    def native_value(self) -> StateType:
        """Return the state of the sensor."""
        if self.coordinator.data:
            # 直接使用coordinator提取的数据
            current_time = self.coordinator.data.get("本轮调整时间", "")
            current_price = self.coordinator.data.get("本轮调整价格", "")
            next_time = self.coordinator.data.get("下轮调整时间", "")
            next_price = self.coordinator.data.get("下轮调整价格", "")
            
            # 如果有下轮调整时间，显示下轮时间
            if next_time:
                # 格式化时间
                next_display = next_time.replace("-", "月").replace("24时", "日24时")
                return f"下次: {next_display}"
            
            # 如果有本轮调整时间，显示本轮时间
            if current_time:
                current_display = current_time.replace("-", "月").replace("24时", "日24时")
                return f"下次: {current_display}"
            
            return "暂无油价信息"
        return None
        
    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Return the state attributes."""
        attrs = {}
        
        if self.coordinator.data:
            # 添加省份信息
            if "省份" in self.coordinator.data:
                attrs["省份"] = self.coordinator.data["省份"]
            else:
                attrs["省份"] = self._province
                
            # 添加各类油价（来自API）
            oil_types = ["柴油", "89#汽油", "92#汽油", "95#汽油", "98#汽油"]
            for oil_type in oil_types:
                if oil_type in self.coordinator.data:
                    attrs[oil_type] = self.coordinator.data[oil_type]

            # 添加本轮调整信息
            if "本轮调整时间" in self.coordinator.data:
                attrs["本轮调整时间"] = self.coordinator.data["本轮调整时间"]
            
            if "本轮调整价格" in self.coordinator.data:
                attrs["本轮调整价格"] = self.coordinator.data["本轮调整价格"]

            # 添加下轮调整时间
            if "下轮调整时间" in self.coordinator.data:
                attrs["下轮调整时间"] = self.coordinator.data["下轮调整时间"]
            
            # 添加下轮调整价格
            if "下轮调整价格" in self.coordinator.data:
                attrs["下轮调整价格"] = self.coordinator.data["下轮调整价格"]

            # 添加全国省份油价排序（按92+95均价从低到高）
            if "全国油价数据" in self.coordinator.data:
                all_provinces = self.coordinator.data["全国油价数据"]
                # 过滤掉均价为None的省份，然后按均价排序
                valid_provinces = [p for p in all_provinces if p.get("均价排序") is not None]
                valid_provinces.sort(key=lambda x: x["均价排序"])
                
                # 移除"均价排序"字段，只保留显示需要的字段
                display_provinces = []
                for p in valid_provinces:
                    display_provinces.append({
                        "省份": p["省份"],
                        "00#柴油": p.get("柴油"),
                        "89#汽油": p.get("89#汽油"),
                        "92#汽油": p.get("92#汽油"),
                        "95#汽油": p.get("95#汽油"),
                        "98#汽油": p.get("98#汽油"),
                    })
                
                attrs["全国油价排序"] = display_provinces
            
            # 添加调整日历（按2026、2025、2024排序，上调加💖，下调加💚）
            if "调整日历" in self.coordinator.data:
                calendar = self.coordinator.data["调整日历"]
                sorted_calendar = {}
                for year in ["2026", "2025", "2024"]:
                    if year in calendar:
                        year_data = dict(calendar[year])
                        # 处理日期中的emoji
                        if "日期" in year_data:
                            dates = {}
                            for date_str, status in year_data["日期"].items():
                                if "上调" in status:
                                    dates[date_str] = status + "💖"
                                elif "下调" in status:
                                    dates[date_str] = status + "💚"
                                else:
                                    dates[date_str] = status
                            year_data["日期"] = dates
                        sorted_calendar[year] = year_data
                attrs["调整日历"] = sorted_calendar

        return attrs

