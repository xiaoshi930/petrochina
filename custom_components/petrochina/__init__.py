"""The Oil Price integration."""
from __future__ import annotations
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.const import Platform
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.frontend import add_extra_js_url

from .const import (
    DOMAIN, 
    CONF_UPDATE_INTERVAL, 
    DEFAULT_UPDATE_INTERVAL,
    CONF_PROVINCE,
    DEFAULT_PROVINCE
)
from .coordinator import OilPriceDataCoordinator

PLATFORMS: list[Platform] = [Platform.SENSOR]

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Oil Price from a config entry."""
    # 获取配置参数
    update_interval = entry.data.get(CONF_UPDATE_INTERVAL, DEFAULT_UPDATE_INTERVAL)
    province = entry.data.get(CONF_PROVINCE, DEFAULT_PROVINCE)
    
    coordinator = OilPriceDataCoordinator(hass, update_interval, province)
    
    # 首次更新数据
    await coordinator.async_config_entry_first_refresh()
    
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = coordinator
    
    await setup_petrochina_card(hass)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN].pop(entry.entry_id)
    
    return unload_ok

async def setup_petrochina_card(hass: HomeAssistant) -> bool:
    petrochina_card_path = '/petrochina_card-local'
    await hass.http.async_register_static_paths([
        StaticPathConfig(petrochina_card_path, hass.config.path('custom_components/petrochina/www'), False)
    ])
    add_extra_js_url(hass, petrochina_card_path + f"/petrochina-card.js")
    return True
