"""Config flow for Oil Price integration."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResult
import homeassistant.helpers.config_validation as cv

from .const import (
    DOMAIN, 
    CONF_UPDATE_INTERVAL, 
    DEFAULT_UPDATE_INTERVAL,
    CONF_PROVINCE,
    DEFAULT_PROVINCE,
    VALID_PROVINCES,
    VALID_PROVINCES_PINYIN
)

_LOGGER = logging.getLogger(__name__)

def _validate_province(province: str) -> str:
    """验证省份名称并处理格式。"""
    # 去掉末尾的"省"或"市"
    if province.endswith("省") or province.endswith("市"):
        province = province[:-1]
    
    # 检查是否在有效省份列表中
    if province not in VALID_PROVINCES:
        raise vol.Invalid(f"无效的省份名称。有效省份: {', '.join(VALID_PROVINCES)}")
    
    return province

class OilPriceConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Oil Price."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the initial step."""
        errors = {}
        
        if user_input is not None:
            try:
                # 验证省份
                province = _validate_province(user_input[CONF_PROVINCE])
                user_input[CONF_PROVINCE] = province
                
                # 使用省份名称的拼音作为唯一ID，允许多次添加不同省份
                try:
                    index = VALID_PROVINCES.index(province)
                    province_pinyin = VALID_PROVINCES_PINYIN[index]
                    await self.async_set_unique_id(f"{DOMAIN}_{province_pinyin}")
                    self._abort_if_unique_id_configured()
                except ValueError:
                    _LOGGER.error("Invalid province: %s", province)
                    return self.async_abort(reason="invalid_province")
                
                return self.async_create_entry(title=f"{province}油价信息", data=user_input)
            except vol.Invalid as err:
                errors["base"] = "invalid_province"
                _LOGGER.error("Province validation error: %s", err)
        
        # 显示配置表单
        schema = vol.Schema({
            vol.Required(CONF_PROVINCE, default=DEFAULT_PROVINCE): str,
            vol.Optional(
                CONF_UPDATE_INTERVAL, default=DEFAULT_UPDATE_INTERVAL
            ): cv.positive_int,
        })
        
        return self.async_show_form(
            step_id="user", 
            data_schema=schema,
            errors=errors,
        )