"""Constants for the Oil Price integration."""

DOMAIN = "petrochina"
DEFAULT_NAME = "油价信息"
CONF_UPDATE_INTERVAL = "update_interval"
DEFAULT_UPDATE_INTERVAL = 1  # 默认1小时更新一次
CONF_PROVINCE = "province"
DEFAULT_PROVINCE = "北京"

# 有效省份列表
VALID_PROVINCES = [
    "安徽", "北京", "重庆", "福建", "甘肃", "广东", "广西", "贵州", "海南", 
    "河北", "黑龙江", "河南", "湖北", "湖南", "江苏", "江西", "吉林", "辽宁", 
    "内蒙古", "宁夏", "青海", "陕西", "上海", "山东", "山西", "四川", "天津", 
    "西藏", "新疆", "云南", "浙江"
]

# 有效省份列表-拼音
VALID_PROVINCES_PINYIN = [
    "anhui", "beijing", "chongqing", "fujian", "gansu", "guangdong", "guangxi", "guizhou", "hainan",
    "hebei", "heilongjiang", "henan", "hubei", "hunan", "jiangsu", "jiangxi", "jilin", "liaoning",
    "neimenggu", "ningxia", "qinghai", "shaanxi", "shanghai", "shandong", "shanxi", "sichuan", "tianjin",
    "xizang", "xinjiang", "yunnan", "zhejiang"
]

# API 配置
OIL_API_URL = "https://v2.xxapi.cn/api/oilPrice"
