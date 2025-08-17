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
            # 显示调价信息
            if change := re.search(r'目前预计(上调|下调)油价(\d+)元/吨', str(self.coordinator.data.get("info", ""))):
                # 吨转升换算 (1吨≈1190升)
                price_per_liter = round(int(change.group(2)) / 1190, 2)
                
                # 根据上调或下调添加箭头
                if change.group(1) == "上调":
                    return f"预计{change.group(1)}油价: {price_per_liter}元/升↑"
                else:
                    return f"预计{change.group(1)}油价: {price_per_liter}元/升↓"
            
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
                
            # 添加各类油价
            oil_types = ["柴油", "89#汽油", "92#汽油", "95#汽油", "98#汽油"]
            for oil_type in oil_types:
                if oil_type in self.coordinator.data:
                    attrs[oil_type] = self.coordinator.data[oil_type]

            # 添加下次调整价格
            if "下次调整价格" in self.coordinator.data:
                attrs["下次调整价格"] = self.coordinator.data["下次调整价格"]

            # 添加下次调整时间
            if "下次调整时间" in self.coordinator.data:
                attrs["下次调整时间"] = self.coordinator.data["下次调整时间"]
                
            # 添加油价趋势
            if "油价趋势" in self.coordinator.data:
                attrs["油价趋势"] = self.coordinator.data["油价趋势"]
            
            # 添加原始数据
            if "原始内容" in self.coordinator.data:
                attrs["原始数据"] = self.coordinator.data["原始内容"]

        return attrs

