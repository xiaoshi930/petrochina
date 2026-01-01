console.info("%c 消逝-油价卡 \n%c      v 2.6 ", "color: red; font-weight: bold; background: black", "color: white; font-weight: bold; background: dimgray");

import { LitElement, html, css } from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

class PetroChinaCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      _searchTerm: { type: String },
      _filteredEntities: { type: Array },
      _showEntityList: { type: Boolean }
    };
  }

  static get styles() {
    return css`
      .form {
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-height: 300px;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      label {
        font-weight: bold;
      }
      select, input, textarea {
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      textarea {
        min-height: 80px;
        resize: vertical;
      }
      .help-text {
        font-size: 0.85em;
        color: #666;
        margin-top: 4px;
      }

      .entity-selector {
        position: relative;
      }

      .entity-search-input {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-sizing: border-box;
      }

      .entity-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        height: 300px;
        overflow-y: auto;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        z-index: 1000;
        margin-top: 2px;
      }

      .entity-option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid #eee;
      }

      .entity-option:hover {
        background: #f5f5f5;
      }

      .entity-option.selected {
        background: #e3f2fd;
      }

      .entity-info {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }

      .entity-details {
        flex: 1;
      }

      .entity-name {
        font-weight: 500;
        font-size: 14px;
        color: #000;
      }

      .entity-id {
        font-size: 12px;
        color: #000;
        font-family: monospace;
      }

      .check-icon {
        color: #4CAF50;
      }

      .no-results {
        padding: 12px;
        text-align: center;
        color: #666;
        font-style: italic;
      }

      .checkbox-group {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        margin-top: 5px;
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        font-weight: normal;
        cursor: pointer;
        font-size: 14px;
        color: #000;
      }

      .checkbox-input {
        margin-right: 6px;
        cursor: pointer;
      }

      .selected-entities {
        margin-top: 8px;
      }

      .selected-label {
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 4px;
        color: #333;
      }

      .selected-entity {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #f0f0f0;
        padding: 4px 8px;
        border-radius: 16px;
        margin: 2px 4px 2px 0;
        font-size: 12px;
        color: #000;
      }

      .remove-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        color: #666;
      }

      .remove-btn:hover {
        color: #f44336;
      }
    `;
  }

  render() {
    if (!this.hass) return html``;

    return html`
      <div class="form">
        <div class="form-group">
          <label>卡片宽度：支持像素(px)和百分比(%)，默认100%</label>
          <input 
            type="text" 
            @change=${this._entityChanged}
            .value=${this.config.width !== undefined ? this.config.width : '100%'}
            name="width"
            placeholder="默认100%"
          />
        </div>
        
        <div class="form-group">
          <label>主题</label>
          <select 
            @change=${this._entityChanged}
            .value=${this.config.theme !== undefined ? this.config.theme : 'on'}
            name="theme"
          >
            <option value="on">浅色主题（白底黑字）</option>
            <option value="off">深色主题（深灰底白字）</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>油价实体：搜索并选择实体</label>
          <div class="entity-selector">
            <input 
              type="text" 
              @input=${this._onEntitySearch}
              @focus=${this._onEntitySearch}
              .value=${this._searchTerm || ''}
              placeholder="搜索实体..."
              class="entity-search-input"
            />
            ${this._showEntityList ? html`
              <div class="entity-dropdown">
                ${this._filteredEntities.map(entity => html`
                  <div 
                    class="entity-option ${this.config.entities && this.config.entities.includes(entity.entity_id) ? 'selected' : ''}"
                    @click=${() => this._toggleEntity(entity.entity_id)}
                  >
                    <div class="entity-info">
                      <ha-icon icon="${entity.attributes.icon || 'mdi:help-circle'}"></ha-icon>
                      <div class="entity-details">
                        <div class="entity-name">${entity.attributes.friendly_name || entity.entity_id}</div>
                        <div class="entity-id">${entity.entity_id}</div>
                      </div>
                    </div>
                    ${this.config.entities && this.config.entities.includes(entity.entity_id) ? 
                      html`<ha-icon icon="mdi:check" class="check-icon"></ha-icon>` : ''}
                  </div>
                `)}
                ${this._filteredEntities.length === 0 ? html`
                  <div class="no-results">未找到匹配的实体</div>
                ` : ''}
              </div>
            ` : ''}
          </div>
          <div class="selected-entities">
            ${this.config.entities && this.config.entities.length > 0 ? html`
              <div class="selected-label">已选择的实体：</div>
              ${this.config.entities.map(entityId => {
                const entity = this.hass.states[entityId];
                return html`
                  <div class="selected-entity">
                    <ha-icon icon="${entity?.attributes.icon || 'mdi:help-circle'}"></ha-icon>
                    <span>${entity?.attributes.friendly_name || entityId}</span>
                    <button class="remove-btn" @click=${() => this._removeEntity(entityId)}>
                      <ha-icon icon="mdi:close"></ha-icon>
                    </button>
                  </div>
                `;
              })}
            ` : ''}
          </div>
          <div class="help-text">
            搜索并选择要显示的油价实体，支持多选
          </div>
        </div>
      </div>

    `;
  }

  _entityChanged(e) {
    const { name, value } = e.target;
    if (!value && name !== 'theme' && name !== 'width' ) return;
    
    let finalValue = value;
    
    // 处理不同字段的默认值
    if (name === 'width') {
      finalValue = value || '100%';
    } 
    
    this.config = {
      ...this.config,
      [name]: finalValue
    };
    
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this.config },
      bubbles: true,
      composed: true
    }));
  }

  _onEntitySearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    this._searchTerm = searchTerm;
    this._showEntityList = true;
    
    if (!this.hass) return;
    
    // 获取所有实体
    const allEntities = Object.values(this.hass.states);
    
    // 过滤实体
    this._filteredEntities = allEntities.filter(entity => {
      const entityId = entity.entity_id.toLowerCase();
      const friendlyName = (entity.attributes.friendly_name || '').toLowerCase();
      
      return entityId.includes(searchTerm) || friendlyName.includes(searchTerm);
    }).slice(0, 50); // 限制显示数量
    
    this.requestUpdate();
  }

  _toggleEntity(entityId) {
    const currentEntities = this.config.entities || [];
    let newEntities;
    
    if (currentEntities.includes(entityId)) {
      // 移除实体
      newEntities = currentEntities.filter(id => id !== entityId);
    } else {
      // 添加实体
      newEntities = [...currentEntities, entityId];
    }
    
    this.config = {
      ...this.config,
      entities: newEntities
    };
    
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this.config },
      bubbles: true,
      composed: true
    }));
    
    this.requestUpdate();
  }

  _removeEntity(entityId) {
    const currentEntities = this.config.entities || [];
    const newEntities = currentEntities.filter(id => id !== entityId);
    
    this.config = {
      ...this.config,
      entities: newEntities
    };
    
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this.config },
      bubbles: true,
      composed: true
    }));
    
    this.requestUpdate();
  }

  // 点击外部关闭下拉列表
  firstUpdated() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.entity-selector')) {
        this._showEntityList = false;
        this.requestUpdate();
      }
    });
  }

  constructor() {
    super();
    this._searchTerm = '';
    this._filteredEntities = [];
    this._showEntityList = false;
  }

  setConfig(config) {
    this.config = config;
  }
} 
customElements.define('xiaoshi-petrochina-card-editor', PetroChinaCardEditor);

class PetroChinaCard extends LitElement {
  static get properties() {
    return {
      hass: Object,
      config: Object,
      _oilPriceData: Array,
      _loading: Boolean,
      _refreshInterval: Number,
      theme: { type: String }
    };
  }

  static get styles() {
    return css`
      :host {
        display: block;
        width: var(--card-width, 100%);
      }

      ha-card {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: var(--bg-color, #fff);
        border-radius: 12px;
      }

      /*标题容器*/
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        background: var(--bg-color, #fff);
        
        border-radius: 12px;
      }

      /*标题红色圆点*/
      .offline-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 8px;
      }

      /*标题红色圆点动画*/
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }

      /*标题*/
      .card-title {
        font-size: 20px;
        font-weight: 500;
        color: var(--fg-color, #000);
        height: 30px;
        line-height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;

      }

      /*标题统计数字*/
      .device-count {
        color: var(--fg-color, #000);
        border-radius: 8px;
        font-size: 13px;
        width: 30px;
        height: 30px;
        text-align: center;
        line-height: 30px;
        font-weight: bold;
        padding: 0px;
      }
      
      .device-count.non-zero {
        background: rgb(255, 0, 0, 0.5);
      }
      
      .device-count.zero {
        background: rgb(0, 205, 0);
      }

      /*标题刷新按钮*/
      .refresh-btn {
        color: var(--fg-color, #fff);
        border: none;
        border-radius: 8px;
        padding: 5px;
        cursor: pointer;
        font-size: 13px;
        width: 50px;
        height: 30px;
        line-height: 30px;
        text-align: center;
        font-weight: bold;
        padding: 0px;
      }

      /*2级标题*/
      .section-divider {
        margin: 0 0 8px 0;
        padding: 8px 8px;
        background: var(--bg-color, #fff);
        font-weight: 500;
        color: var(--fg-color, #000);
        border-top: 1px solid rgb(150,150,150,0.5);
        border-bottom: 1px solid rgb(150,150,150,0.5);
        margin: 0 16px 0 16px;

      }
      
      /*2级标题字体*/
      .section-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--fg-color, #000);
        font-size: 13px;
      }

      /*2级标题,统计数量字体*/
      .section-count {
        background: rgb(255,0,0,0.5);
        color: var(--fg-color, #000);
        border-radius: 12px;
        width: 15px;
        height: 15px;
        text-align: center;
        line-height: 15px;
        padding: 3px;
        font-size: 12px;
        font-weight: bold;
      }

      /*设备、实体明细*/
      .device-item {
        display: flex;
        align-items: center;
        padding: 0px;
        border-bottom: 1px solid rgb(150,150,150,0.2);
        margin: 0 32px 0px 32px;
      }

      /*设备、实体明细背景*/
      .devices-list {
        flex: 1;
        overflow-y: auto;
        min-height: 0;
        padding: 0 0 8px 0;
      }

      .device-icon {
        margin-right: 12px;
        color: var(--error-color);
      }

      .device-info {
        flex-grow: 1;
        padding: 6px 0;
      }

      .device-name {
        font-weight: 500;
        color: var(--fg-color, #000);
        padding: 6px 0 0 0;
      }

      .device-entity {
        font-size: 10px;
        color: var(--fg-color, #000);
        font-family: monospace;
      }

      .device-details {
        font-size: 10px;
        color: var(--fg-color, #000);
      }

      .device-last-seen {
        font-size: 10px;
        color: var(--fg-color, #000);
        margin-left: auto;
      }

      .no-devices {
        text-align: center;
        padding: 8px 0 0 0;
        color: var(--fg-color, #000);
      }

      .loading {
        text-align: center;
        padding: 0px;
        color: var(--fg-color, #000);
      }

      /*加油图标样式*/
      .device-details ha-icon {
        --mdc-icon-size: 12px;
        color: var(--fg-color, #000);
      }
    `;
  }

  constructor() {
    super();
    this._oilPriceData = [];
    this._loading = false;
    this._refreshInterval = null;
    this.theme = 'on';
  }

  static getConfigElement() {
    return document.createElement("xiaoshi-petrochina-card-editor");
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadOilPriceData();
    
    // 设置主题属性
    this.setAttribute('theme', this._evaluateTheme());
    
    // 每300秒刷新一次数据，减少频繁刷新
    this._refreshInterval = setInterval(() => {
      this._loadOilPriceData();
    }, 300000);
  }

  _evaluateTheme() {
    try {
      if (!this.config || !this.config.theme) return 'on';
      if (typeof this.config.theme === 'function') {
          return this.config.theme();
      }
      if (typeof this.config.theme === 'string' && 
              (this.config.theme.includes('return') || this.config.theme.includes('=>'))) {
          return (new Function(`return ${this.config.theme}`))();
      }
      return this.config.theme;
    } catch(e) {
      console.error('计算主题时出错:', e);
      return 'on';
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
    }
  }

  async _loadOilPriceData() {
    if (!this.hass) return;
    
    this._loading = true;
    this.requestUpdate();

    try {
      const entities = this.config.entities || [];
      const oilPriceData = [];

      for (const entityId of entities) {
        const entity = this.hass.states[entityId];
        if (!entity) continue;

        const attributes = entity.attributes;
        oilPriceData.push({
          entity_id: entityId,
          friendly_name: attributes.friendly_name || entityId,
          province: attributes.省份 || '未知省份',
          diesel: attributes.柴油 || 0,
          gasoline89: attributes['89#汽油'] || 0,
          gasoline92: attributes['92#汽油'] || 0,
          gasoline95: attributes['95#汽油'] || 0,
          gasoline98: attributes['98#汽油'] || 0,
          next_adjustment_price: attributes.下次调整价格 || '',
          next_adjustment_time: attributes.下次调整时间 || '',
          price_trend: attributes.油价趋势 || '',
          raw_data: attributes.原始数据 || '',
          icon: attributes.icon || 'mdi:gas-station',
          expected_adjustment: entity.state || '0'
        });
      }

      this._oilPriceData = oilPriceData;
    } catch (error) {
      console.error('加载油价数据失败:', error);
      this._oilPriceData = [];
    }

    this._loading = false;
  }

  _handleRefresh() {
    this._loadOilPriceData();
    navigator.vibrate(50);
  }

  _handleEntityClick(entity) {
    navigator.vibrate(50);
    // 点击实体时打开实体详情页
    if (entity.entity_id) {
      const evt = new Event('hass-more-info', { composed: true });
      evt.detail = { entityId: entity.entity_id };
      this.dispatchEvent(evt);
    }
  }

  _getPriceColor(text) {
    if (!text) return 'var(--fg-color, #000)';
    
    const lowerText = text.toLowerCase();
    if (lowerText.includes('下调') || lowerText.includes('下降') || lowerText.includes('降')) {
      return '#4CAF50'; // 绿色
    } else if (lowerText.includes('上调') || lowerText.includes('上升') || lowerText.includes('涨')) {
      return '#F44336'; // 红色
    }
    return 'var(--fg-color, #000)'; // 默认颜色
  }

  render() {
    if (!this.hass) {
      return html`<div class="loading">等待Home Assistant连接...</div>`;
    }
    // 获取主题和颜色
    const theme = this._evaluateTheme();
    const fgColor = theme === 'on' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
    const bgColor = theme === 'on' ? 'rgb(255, 255, 255)' : 'rgb(50, 50, 50)';
    
    return html`
      <ha-card style="--fg-color: ${fgColor}; --bg-color: ${bgColor};">
        <div class="card-header">
          <div class="card-title">
            <span class="offline-indicator" style="background: rgb(255,165,0); animation: pulse 2s infinite"></span>
            中国油价信息
          </div>
        </div>
        
        <div class="devices-list">
          ${this._loading ? 
            html`<div class="loading">加载中...</div>` :
            
            this._oilPriceData.length === 0 ? 
              html`<div class="no-devices">请配置油价实体</div>` :
              html`
                ${this._oilPriceData.map(oilData => html`
                  <div class="section-divider">
                    <div class="section-title">
                      <span>${oilData.province}：<span style="color: ${this._getPriceColor(oilData.expected_adjustment)}">${oilData.expected_adjustment}</span></span>
                    </div>
                  </div>
                  <div class="device-item" @click=${() => this._handleEntityClick(oilData)}>
                    <div class="device-info">
                      <div class="device-details">
                        <ha-icon icon="mdi:gas-station"></ha-icon> 92#: ¥${oilData.gasoline92}&emsp;<ha-icon icon="mdi:gas-station"></ha-icon> 95#: ¥${oilData.gasoline95}&emsp;<ha-icon icon="mdi:gas-station"></ha-icon> 98#: ¥${oilData.gasoline98}&emsp;<ha-icon icon="mdi:gas-station"></ha-icon> 柴油: ¥${oilData.diesel}
                      </div>
                      <div class="device-details">
                        ${oilData.next_adjustment_time} - ${oilData.next_adjustment_price}
                      </div>
                      <div class="device-details" style="color: ${this._getPriceColor(oilData.price_trend)}">
                        ${oilData.price_trend}
                      </div>
                    </div>
                  </div>
                `)}
              `
          }
        </div>
      </ha-card>
    `;
  }

  setConfig(config) {
    this.config = config;
    
    // 设置CSS变量来控制卡片的宽度和高度
    if (config.width) {
      this.style.setProperty('--card-width', config.width);
    }
    
    // 设置主题
    if (config.theme) {
      this.setAttribute('theme', config.theme);
    }
  }

  getCardSize() {
    // 根据油价实体数量动态计算卡片大小
    const baseSize = 3;
    const entitySize = Math.max(0, Math.min(this._oilPriceData.length * 2, 10));
    return baseSize + entitySize;
  }
}
customElements.define('xiaoshi-petrochina-card', PetroChinaCard);

class PetroChinaButtonEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      _searchTerm: { type: String },
      _filteredEntities: { type: Array },
      _showEntityList: { type: Boolean } //button新元素
    };
  }

  static get styles() {
    return css`
      .form {
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-height: 300px;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      label {
        font-weight: bold;
      }
      select, input, textarea {
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      textarea {
        min-height: 80px;
        resize: vertical;
      }
      .help-text {
        font-size: 0.85em;
        color: #666;
        margin-top: 4px;
      }

      .entity-selector {
        position: relative;
      }

      .entity-search-input {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-sizing: border-box;
      }

      .entity-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        height: 300px;
        overflow-y: auto;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        z-index: 1000;
        margin-top: 2px;
      }

      .entity-option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid #eee;
      }

      .entity-option:hover {
        background: #f5f5f5;
      }

      .entity-option.selected {
        background: #e3f2fd;
      }

      .entity-info {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }

      .entity-details {
        flex: 1;
      }

      .entity-name {
        font-weight: 500;
        font-size: 14px;
        color: #000;
      }

      .entity-id {
        font-size: 12px;
        color: #000;
        font-family: monospace;
      }

      .check-icon {
        color: #4CAF50;
      }

      .no-results {
        padding: 12px;
        text-align: center;
        color: #666;
        font-style: italic;
      }

      .checkbox-group {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        margin-top: 5px;
      }
      .checkbox-group2 {
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        font-weight: normal;
        cursor: pointer;
        font-size: 14px;
        color: #fff;
      }

      .checkbox-input {
        margin-right: 6px;
        cursor: pointer;
      }

      .selected-entities {
        margin-top: 8px;
      }

      .selected-label {
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 4px;
        color: #333;
      }

      .selected-entity {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #f0f0f0;
        padding: 4px 8px;
        border-radius: 16px;
        margin: 2px 4px 2px 0;
        font-size: 12px;
        color: #000;
      }

      .remove-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        color: #666;
      }

      .remove-btn:hover {
        color: #f44336;
      }
    `;
  }

  render() {
    if (!this.hass) return html``;

    return html`
      <div class="form">

      <!-- button新元素 开始-->
        <div class="form-group">
          <label>按钮显示图标
          <input 
            type="text" 
            @change=${this._entityChanged}
            .value=${this.config.button_icon !== undefined ? this.config.button_icon : 'mdi:gas-station'}
            name="button_icon"
            placeholder="mdi:gas-station"
          /></label>
        </div>

        <div class="checkbox-group2">
          <input 
            type="checkbox" 
            class="checkbox-input"
            @change=${this._entityChanged}
            .checked=${this.config.transparent_bg === true}
            name="transparent_bg"
            id="transparent_bg"
          />
          <label for="transparent_bg" > 
            （平板端特性）透明背景（勾选后按钮背景透明）
          </label>
        </div>

        <div class="checkbox-group2">
          <input 
            type="checkbox" 
            class="checkbox-input"
            @change=${this._entityChanged}
            .checked=${this.config.lock_white_fg === true}
            name="lock_white_fg"
            id="lock_white_fg" 
          />
          <label for="lock_white_fg" > 
          （平板端特性）白色图标文字（勾选后锁定显示白色）
          </label>
        </div>

        <div class="checkbox-group2">
          <input 
            type="checkbox" 
            class="checkbox-input"
            @change=${this._entityChanged}
            .checked=${this.config.hide_icon === true}
            name="hide_icon"
            id="hide_icon"
          />
          <label for="hide_icon" > 
          （ 平板端特性）隐藏图标（勾选后隐藏图标）
          </label>
        </div>

        <div class="form-group">
          <label>显示的油品类型（取实体明细中的第一个）</label>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                class="checkbox-input"
                @change=${this._entityChanged}
                .checked=${this.config.show_diesel === true}
                name="show_diesel"
              />
              柴油
            </label>
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                class="checkbox-input"
                @change=${this._entityChanged}
                .checked=${this.config.show_gasoline89 === true}
                name="show_gasoline89"
              />
              89#汽油
            </label>
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                class="checkbox-input"
                @change=${this._entityChanged}
                .checked=${this.config.show_gasoline92 === true}
                name="show_gasoline92"
              />
              92#汽油
            </label>
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                class="checkbox-input"
                @change=${this._entityChanged}
                .checked=${this.config.show_gasoline95 === true}
                name="show_gasoline95"
              />
              95#汽油
            </label>
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                class="checkbox-input"
                @change=${this._entityChanged}
                .checked=${this.config.show_gasoline98 === true}
                name="show_gasoline98"
              />
              98#汽油
            </label>
          </div>
        </div>


        <div class="form-group">
          <label>小数点精度：控制显示的小数位数，默认1位</label>
          <input 
            type="number" 
            @change=${this._entityChanged}
            .value=${this.config.decimal_precision !== undefined ? this.config.decimal_precision : '1'}
            name="decimal_precision"
            placeholder="默认1"
            min="0"
            max="10"
            step="1"
          />
        </div>

        <div class="form-group">
          <label>按钮宽度：默认65px, 支持像素(px)和百分比(%)</label>
          <input 
            type="text" 
            @change=${this._entityChanged}
            .value=${this.config.button_width !== undefined ? this.config.button_width : '65px'}
            name="button_width"
            placeholder="默认65px"
          />
        </div>

        <div class="form-group">
          <label>按钮高度：支持像素(px)、百分比(%)和视窗高度(vh)，默认24px</label>
          <input 
            type="text" 
            @change=${this._entityChanged}
            .value=${this.config.button_height !== undefined ? this.config.button_height : '24px'}
            name="button_height"
            placeholder="默认24px"
            />
        </div>
        
        <div class="form-group">
          <label>按钮文字大小：支持像素(px)，默认11px</label>
          <input 
            type="text" 
            @change=${this._entityChanged}
            .value=${this.config.button_font_size !== undefined ? this.config.button_font_size : '11px'}
            name="button_font_size"
            placeholder="默认11px"
          />
        </div>
        
        <div class="form-group">
          <label>按钮图标大小：支持像素(px)，默认13px</label>
          <input 
            type="text" 
            @change=${this._entityChanged}
            .value=${this.config.button_icon_size !== undefined ? this.config.button_icon_size : '13px'}
            name="button_icon_size"
            placeholder="默认13px"
          />
        </div>

        <div class="form-group">
          <label>点击动作：点击按钮时触发的动作</label>
          <select 
            @change=${this._entityChanged}
            .value=${this.config.tap_action !== 'none' ? 'tap_action' : 'none'}
            name="tap_action"
          >
            <option value="tap_action">弹出余额信息卡片（默认）</option>
            <option value="none">无动作</option>
          </select>
        </div>

        <div class="form-group">
          <label>👇👇👇下方弹出的卡片可增加的其他卡片👇👇👇</label>
          <textarea 
            @change=${this._entityChanged}
            .value=${this.config.other_cards || ''}
            name="other_cards"
            placeholder='# 示例配置：添加button卡片
- type: custom:button-card
  template: 测试模板(最好引用模板，否则大概率会报错)
- type: custom:button-card
  template: 测试模板(最好引用模板，否则大概率会报错)'>
          </textarea>
        </div>

        <div class="checkbox-group">
          <input 
            type="checkbox" 
            class="checkbox-input"
            @change=${this._entityChanged}
            .checked=${this.config.no_preview === true}
            name="no_preview"
            id="no_preview"
          />
          <label for="no_preview" class="checkbox-label" style="color: red;"> 
            📻显示预览📻（ 请先勾选测试显示效果 ）
          </label>
        </div>


        <div class="form-group">
          <label> </label>
          <label>👇👇👇下方是弹出的主卡配置项👇👇👇</label>
          <label> </label>
        </div>

        <!-- button新元素 结束-->

        <div class="form-group">
          <label>卡片宽度：支持像素(px)和百分比(%)，默认100%</label>
          <input 
            type="text" 
            @change=${this._entityChanged}
            .value=${this.config.width !== undefined ? this.config.width : '100%'}
            name="width"
            placeholder="默认100%"
          />
        </div>
        
        <div class="form-group">
          <label>主题</label>
          <select 
            @change=${this._entityChanged}
            .value=${this.config.theme !== undefined ? this.config.theme : 'on'}
            name="theme"
          >
            <option value="on">浅色主题（白底黑字）</option>
            <option value="off">深色主题（深灰底白字）</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>油价实体：搜索并选择实体</label>
          <div class="entity-selector">
            <input 
              type="text" 
              @input=${this._onEntitySearch}
              @focus=${this._onEntitySearch}
              .value=${this._searchTerm || ''}
              placeholder="搜索实体..."
              class="entity-search-input"
            />
            ${this._showEntityList ? html`
              <div class="entity-dropdown">
                ${this._filteredEntities.map(entity => html`
                  <div 
                    class="entity-option ${this.config.entities && this.config.entities.includes(entity.entity_id) ? 'selected' : ''}"
                    @click=${() => this._toggleEntity(entity.entity_id)}
                  >
                    <div class="entity-info">
                      <ha-icon icon="${entity.attributes.icon || 'mdi:help-circle'}"></ha-icon>
                      <div class="entity-details">
                        <div class="entity-name">${entity.attributes.friendly_name || entity.entity_id}</div>
                        <div class="entity-id">${entity.entity_id}</div>
                      </div>
                    </div>
                    ${this.config.entities && this.config.entities.includes(entity.entity_id) ? 
                      html`<ha-icon icon="mdi:check" class="check-icon"></ha-icon>` : ''}
                  </div>
                `)}
                ${this._filteredEntities.length === 0 ? html`
                  <div class="no-results">未找到匹配的实体</div>
                ` : ''}
              </div>
            ` : ''}
          </div>
          <div class="selected-entities">
            ${this.config.entities && this.config.entities.length > 0 ? html`
              <div class="selected-label">已选择的实体：</div>
              ${this.config.entities.map(entityId => {
                const entity = this.hass.states[entityId];
                return html`
                  <div class="selected-entity">
                    <ha-icon icon="${entity?.attributes.icon || 'mdi:help-circle'}"></ha-icon>
                    <span>${entity?.attributes.friendly_name || entityId}</span>
                    <button class="remove-btn" @click=${() => this._removeEntity(entityId)}>
                      <ha-icon icon="mdi:close"></ha-icon>
                    </button>
                  </div>
                `;
              })}
            ` : ''}
          </div>
          <div class="help-text">
            搜索并选择要显示的油价实体，支持多选
          </div>
        </div>
      </div>

    `;
  }

  _entityChanged(e) {
    
    /*button新按钮方法 开始*/
    const { name, value, type, checked } = e.target;
    
    let finalValue;
    // 处理复选框
    if (type === 'checkbox') {
      finalValue = checked;
    } else {
      if (!value && name !== 'theme' && name !== 'button_width' && name !== 'button_height' && name !== 'button_font_size' && name !== 'button_icon_size' && name !== 'width' && name !== 'tap_action' && name !== 'decimal_precision') return;
      finalValue = value 
    }
    
    // 处理不同字段的默认值
    if (name === 'button_width') {
      finalValue = value || '100%';
    } else if (name === 'button_height') {
      finalValue = value || '24px';
    } else if (name === 'button_font_size') {
      finalValue = value || '11px';
    } else if (name === 'button_icon_size') {
      finalValue = value || '13px';
    } else if (name === 'width') {
      finalValue = value || '100%';

    } else if (name === 'decimal_precision') {
      finalValue = value !== undefined ? parseInt(value) : 1;
    } else if (name === 'tap_action') {
      // 处理 tap_action 的特殊逻辑
      if (value === 'tap_action') {
        // 如果是弹出卡片，则不设置 tap_action，让组件使用默认逻辑
        finalValue = undefined;
      } else {
        finalValue = value;
      }
    }
    /*button新按钮方法 结束*/
    this.config = {
      ...this.config,
      [name]: finalValue
    };
    
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this.config },
      bubbles: true,
      composed: true
    }));
  }

  _onEntitySearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    this._searchTerm = searchTerm;
    this._showEntityList = true;
    
    if (!this.hass) return;
    
    // 获取所有实体
    const allEntities = Object.values(this.hass.states);
    
    // 过滤实体
    this._filteredEntities = allEntities.filter(entity => {
      const entityId = entity.entity_id.toLowerCase();
      const friendlyName = (entity.attributes.friendly_name || '').toLowerCase();
      
      return entityId.includes(searchTerm) || friendlyName.includes(searchTerm);
    }).slice(0, 50); // 限制显示数量
    
    this.requestUpdate();
  }

  _toggleEntity(entityId) {
    const currentEntities = this.config.entities || [];
    let newEntities;
    
    if (currentEntities.includes(entityId)) {
      // 移除实体
      newEntities = currentEntities.filter(id => id !== entityId);
    } else {
      // 添加实体
      newEntities = [...currentEntities, entityId];
    }
    
    this.config = {
      ...this.config,
      entities: newEntities
    };
    
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this.config },
      bubbles: true,
      composed: true
    }));
    
    this.requestUpdate();
  }

  _removeEntity(entityId) {
    const currentEntities = this.config.entities || [];
    const newEntities = currentEntities.filter(id => id !== entityId);
    
    this.config = {
      ...this.config,
      entities: newEntities
    };
    
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this.config },
      bubbles: true,
      composed: true
    }));
    
    this.requestUpdate();
  }

  // 点击外部关闭下拉列表
  firstUpdated() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.entity-selector')) {
        this._showEntityList = false;
        this.requestUpdate();
      }
    });
  }

  constructor() {
    super();
    this._searchTerm = '';
    this._filteredEntities = [];
    this._showEntityList = false;
  }

  setConfig(config) {
    this.config = config;
  }
} 
customElements.define('xiaoshi-petrochina-button-editor', PetroChinaButtonEditor);

class PetroChinaButton extends LitElement {
  static get properties() {
    return {
      hass: Object,
      config: Object,
      _oilPriceData: Array,
      _loading: Boolean,
      _refreshInterval: Number,
      _dataLoaded: Boolean,   //button新元素
      theme: { type: String }
    };
  }

  static get styles() {
    return css`
      :host {
        display: block;
        width: var(--card-width, 100%);
      }

      /*button新元素 开始*/
      .balance-status {
        width: var(--button-width, 65px);
        height: var(--button-height, 24px);
        padding: 0;
        margin: 0;
        background: var(--bg-color, #fff);
        color: var(--fg-color, #000);
        border-radius: 10px;
        font-size: var(--button-font-size, 11px);
        font-weight: 500;
        text-align: center;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0;
        cursor: pointer;
        transition: background-color 0.2s, transform 0.1s;
        position: relative;
      }

      .status-icon {
        --mdc-icon-size: var(--button-icon-size, 13px);
        color: var(--fg-color, #000);
        margin-right: 3px;
      }

      /*button新元素 结束*/

      ha-card {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: var(--bg-color, #fff);
        border-radius: 12px;
      }

      /*标题容器*/
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        background: var(--bg-color, #fff);
        
        border-radius: 12px;
      }

      /*标题红色圆点*/
      .offline-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 8px;
      }

      /*标题红色圆点动画*/
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }

      /*标题*/
      .card-title {
        font-size: 20px;
        font-weight: 500;
        color: var(--fg-color, #000);
        height: 30px;
        line-height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;

      }

      /*标题统计数字*/
      .device-count {
        color: var(--fg-color, #000);
        border-radius: 8px;
        font-size: 13px;
        width: 30px;
        height: 30px;
        text-align: center;
        line-height: 30px;
        font-weight: bold;
        padding: 0px;
      }
      
      .device-count.non-zero {
        background: rgb(255, 0, 0, 0.5);
      }
      
      .device-count.zero {
        background: rgb(0, 205, 0);
      }

      /*标题刷新按钮*/
      .refresh-btn {
        color: var(--fg-color, #fff);
        border: none;
        border-radius: 8px;
        padding: 5px;
        cursor: pointer;
        font-size: 13px;
        width: 50px;
        height: 30px;
        line-height: 30px;
        text-align: center;
        font-weight: bold;
        padding: 0px;
      }

      /*2级标题*/
      .section-divider {
        margin: 0 0 8px 0;
        padding: 8px 8px;
        background: var(--bg-color, #fff);
        font-weight: 500;
        color: var(--fg-color, #000);
        border-top: 1px solid rgb(150,150,150,0.5);
        border-bottom: 1px solid rgb(150,150,150,0.5);
        margin: 0 16px 0 16px;

      }
      
      /*2级标题字体*/
      .section-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--fg-color, #000);
        font-size: 13px;
      }

      /*2级标题,统计数量字体*/
      .section-count {
        background: rgb(255,0,0,0.5);
        color: var(--fg-color, #000);
        border-radius: 12px;
        width: 15px;
        height: 15px;
        text-align: center;
        line-height: 15px;
        padding: 3px;
        font-size: 12px;
        font-weight: bold;
      }

      /*设备、实体明细*/
      .device-item {
        display: flex;
        align-items: center;
        padding: 0px;
        border-bottom: 1px solid rgb(150,150,150,0.2);
        margin: 0 32px 0px 32px;
      }

      /*设备、实体明细背景*/
      .devices-list {
        flex: 1;
        overflow-y: auto;
        min-height: 0;
        padding: 0 0 8px 0;
      }

      .device-icon {
        margin-right: 12px;
        color: var(--error-color);
      }

      .device-info {
        flex-grow: 1;
        padding: 6px 0;
      }

      .device-name {
        font-weight: 500;
        color: var(--fg-color, #000);
        padding: 6px 0 0 0;
      }

      .device-entity {
        font-size: 10px;
        color: var(--fg-color, #000);
        font-family: monospace;
      }

      .device-details {
        font-size: 10px;
        color: var(--fg-color, #000);
      }

      .device-last-seen {
        font-size: 10px;
        color: var(--fg-color, #000);
        margin-left: auto;
      }

      .no-devices {
        text-align: center;
        padding: 8px 0 0 0;
        color: var(--fg-color, #000);
      }

      .loading {
        text-align: center;
        padding: 0px;
        color: var(--fg-color, #000);
      }

      /*加油图标样式*/
      .device-details ha-icon {
        --mdc-icon-size: 12px;
        color: var(--fg-color, #000);
      }
    `;
  }

  constructor() {
    super();
    this._oilPriceData = [];
    this._loading = false;
    this._dataLoaded = false;  //button新元素
    this._refreshInterval = null;
    this.theme = 'on';
  }

  static getConfigElement() {
    return document.createElement("xiaoshi-petrochina-button-editor");
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadOilPriceData();
    
    // 设置主题属性
    this.setAttribute('theme', this._evaluateTheme());

    //button新元素 开始
    setTimeout(() => {
      this._loadOilPriceData();
    }, 50);
    //button新元素 结束

    // 每300秒刷新一次数据，减少频繁刷新
    this._refreshInterval = setInterval(() => {
      this._loadOilPriceData();
    }, 300000);
  }

  _evaluateTheme() {
    try {
      if (!this.config || !this.config.theme) return 'on';
      if (typeof this.config.theme === 'function') {
          return this.config.theme();
      }
      if (typeof this.config.theme === 'string' && 
              (this.config.theme.includes('return') || this.config.theme.includes('=>'))) {
          return (new Function(`return ${this.config.theme}`))();
      }
      return this.config.theme;
    } catch(e) {
      console.error('计算主题时出错:', e);
      return 'on';
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
    }
  }

  async _loadOilPriceData() {
    if (!this.hass) return;
    
    
    // button新元素 开始 删除下面
    // this._loading = true;
    // this.requestUpdate();
    // button新元素 介素 删除下面

    try {
      const entities = this.config.entities || [];
      const oilPriceData = [];

      for (const entityId of entities) {
        const entity = this.hass.states[entityId];
        if (!entity) continue;

        const attributes = entity.attributes;
        oilPriceData.push({
          entity_id: entityId,
          friendly_name: attributes.friendly_name || entityId,
          province: attributes.省份 || '未知省份',
          diesel: attributes.柴油 || 0,
          gasoline89: attributes['89#汽油'] || 0,
          gasoline92: attributes['92#汽油'] || 0,
          gasoline95: attributes['95#汽油'] || 0,
          gasoline98: attributes['98#汽油'] || 0,
          next_adjustment_price: attributes.下次调整价格 || '',
          next_adjustment_time: attributes.下次调整时间 || '',
          price_trend: attributes.油价趋势 || '',
          raw_data: attributes.原始数据 || '',
          icon: attributes.icon || 'mdi:gas-station',
          expected_adjustment: entity.state || '0'
        });
      }

      this._oilPriceData = oilPriceData;
      this._dataLoaded = true;  //button新元素
    } catch (error) {
      console.error('加载油价数据失败:', error);
      this._oilPriceData = [];
      this._dataLoaded = true;  //button新元素
    }

    this._loading = false;
  }

  _handleRefresh() {
    this._loadOilPriceData();
    navigator.vibrate(50);
  }

  _handleEntityClick(entity) {
    navigator.vibrate(50);
    // 点击实体时打开实体详情页
    if (entity.entity_id) {
      const evt = new Event('hass-more-info', { composed: true });
      evt.detail = { entityId: entity.entity_id };
      this.dispatchEvent(evt);
    }
  }


  /*button新元素 开始*/
  _handleButtonClick() {
    const tapAction = this.config.tap_action;
    
    if (!tapAction || tapAction !== 'none') {
      // 默认 tap_action 行为：弹出垂直堆叠卡片
      const excludedParams = ['type', 'button_height', 'button_width', 'button_font_size', 'button_icon_size', 'show_preview', 'tap_action'];
      
      // 构建垂直堆叠卡片的内容
      const cards = [];
      
      // 1. 添加余额信息卡片
      const balanceCardConfig = {};
      Object.keys(this.config).forEach(key => {
        if (!excludedParams.includes(key) && key !== 'other_cards' && key !== 'no_preview') {
          balanceCardConfig[key] = this.config[key];
        }
      });
      
      cards.push({
        type: 'custom:xiaoshi-petrochina-card',
        ...balanceCardConfig
      });
      
      // 2. 添加附加卡片
      if (this.config.other_cards && this.config.other_cards.trim()) {
        try {
          const additionalCardsConfig = this._parseYamlCards(this.config.other_cards);
          
          // 为每个附加卡片传递 theme 值
          const cardsWithTheme = additionalCardsConfig.map(card => {
            // 如果卡片没有 theme 配置，则从当前卡片配置中传递
            if (!card.theme && this.config.theme) {
              return {
                ...card,
                theme: this.config.theme
              };
            }
            return card;
          });
          
          cards.push(...cardsWithTheme);
        } catch (error) {
          console.error('解析附加卡片配置失败:', error);
        }
      }
      
      // 创建垂直堆叠卡片
      const popupContent = {
        type: 'vertical-stack',
        cards: cards
      };
      
      const popupStyle = this.config.popup_style || `
        --mdc-theme-surface: rgb(0,0,0,0); 
        --dialog-backdrop-filter: blur(10px) brightness(1);
      `;
      
      if (window.browser_mod) {
        window.browser_mod.service('popup', { 
          style: popupStyle,
          content: popupContent
        });
      } else {
        console.warn('browser_mod not available, cannot show popup');
      }
    }
    this._handleClick();
  }

  _handleClick(){
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    else if (navigator.webkitVibrate) {
        navigator.webkitVibrate(50); 
    }
    else {
    }
  }

  _parseYamlCards(yamlString) {
    try {
      const lines = yamlString.split('\n');
      const cards = [];
      let currentCard = null;
      let indentStack = [];
      let contextStack = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const indentLevel = line.length - line.trimStart().length;
        if (trimmed.startsWith('- type')) {
          if (currentCard) {
            cards.push(currentCard);
            currentCard = null;
            indentStack = [];
            contextStack = [];
          }
          const content = trimmed.substring(1).trim();
          if (content.includes(':')) {
            const [key, ...valueParts] = content.split(':');
            const value = valueParts.join(':').trim();
            currentCard = {};
            this._setNestedValue(currentCard, key.trim(), this._parseValue(value));
          } else {
            currentCard = { type: content };
          }
          
          indentStack = [indentLevel];
          contextStack = [currentCard];
        } else if (currentCard && trimmed.startsWith('-')) {
          while (indentStack.length > 1 && indentLevel <= indentStack[indentStack.length - 1]) {
            indentStack.pop();
            contextStack.pop();
          }
          
          let currentContext = contextStack[contextStack.length - 1];
          const itemValue = trimmed.substring(1).trim();
          
          if (!Array.isArray(currentContext)) {
            if (contextStack.length > 1) {
              const parentContext = contextStack[contextStack.length - 2];
              for (let key in parentContext) {
                if (parentContext[key] === currentContext) {
                  parentContext[key] = [];
                  contextStack[contextStack.length - 1] = parentContext[key];
                  currentContext = parentContext[key];
                  break;
                }
              }
            }
          }
          if (Array.isArray(currentContext)) {
            if (itemValue.includes(':')) {
              const [key, ...valueParts] = itemValue.split(':');
              const value = valueParts.join(':').trim();
              const obj = {};
              obj[key.trim()] = this._parseValue(value);
              currentContext.push(obj);
            } else {
              currentContext.push(this._parseValue(itemValue));
            }
          }
        } else if (currentCard && trimmed.includes(':')) {
          const [key, ...valueParts] = trimmed.split(':');
          const value = valueParts.join(':').trim();
          const keyName = key.trim();
          
          while (indentStack.length > 1 && indentLevel <= indentStack[indentStack.length - 1]) {
            indentStack.pop();
            contextStack.pop();
          }
          
          const currentContext = contextStack[contextStack.length - 1];
          
          if (value) {
            this._setNestedValue(currentContext, keyName, this._parseValue(value));
          } else {
            let nextLine = null, nextIndent = null;
            for (let j = i + 1; j < lines.length; j++) {
              const nextTrimmed = lines[j].trim();
              if (nextTrimmed && !nextTrimmed.startsWith('#')) {
                nextLine = nextTrimmed;
                nextIndent = lines[j].length - lines[j].trimStart().length;
                break;
              }
            }
            
            currentContext[keyName] = (nextLine && nextLine.startsWith('-') && nextIndent > indentLevel) 
              ? [] : (currentContext[keyName] || {});
            
            indentStack.push(indentLevel);
            contextStack.push(currentContext[keyName]);
          }
        }
      }
      
      if (currentCard) cards.push(currentCard);
      
      return cards;
    } catch (error) {
      console.error('YAML解析错误:', error);
      return [];
    }
  }
  
  _parseValue(value) {
    if (!value) return '';
    
    // 移除引号
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    
    // 尝试解析为数字
    if (!isNaN(value) && value.trim() !== '') {
      return Number(value);
    }
    
    // 尝试解析为布尔值
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    
    // 返回字符串
    return value;
  }
  
  _setNestedValue(obj, path, value) {
    // 支持嵌套路径，如 "styles.card"
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /*button新元素 结束*/

  _getPriceColor(text) {
    if (!text) return 'var(--fg-color, #000)';
    
    const lowerText = text.toLowerCase();
    if (lowerText.includes('下调') || lowerText.includes('下降') || lowerText.includes('降')) {
      return '#4CAF50'; // 绿色
    } else if (lowerText.includes('上调') || lowerText.includes('上升') || lowerText.includes('涨')) {
      return '#F44336'; // 红色
    }
    return 'var(--fg-color, #000)'; // 默认颜色
  }

  render() {
    if (!this.hass) {
      return html`<div class="loading">等待Home Assistant连接...</div>`;
    }
    // 获取主题和颜色
    const theme = this._evaluateTheme();
    const fgColor = theme === 'on' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
    const bgColor = theme === 'on' ? 'rgb(255, 255, 255)' : 'rgb(50, 50, 50)';

    /*button新元素 前9行和最后1行开始*/
    const showPreview = this.config.no_preview === true;
    
    // 获取参数
    const transparentBg = this.config.transparent_bg === true;
    const hideIcon = this.config.hide_icon === true;
    const lockWhiteFg = this.config.lock_white_fg === true;
    const buttonIcon = this.config.button_icon || 'mdi:gas-station';
    
    // 设置背景颜色
    const buttonBgColor = transparentBg ? 'transparent' : theme === 'on' ? 'rgb(255, 255, 255, 0.6)' : 'rgb(83, 83, 83, 0.6)';
    
    // 获取小数点精度
    const decimalPrecision = this.config.decimal_precision !== undefined ? parseInt(this.config.decimal_precision) : 1;
    
    // 计算显示值
    let displayValue = null;
    let displayUnit = '元';
    
    if (!this._dataLoaded) {
      // 数据加载中
      displayValue = '加载中';
      displayUnit = '';
    } else if (this._oilPriceData.length === 0) {
      // 无数据
      displayValue = '无数据';
      displayUnit = '';
    } else {
      // 默认使用油价实体列表中的第一个
      const entities = this.config.entities || [];
      let entity = null;
      
      if (entities.length > 0) {
        entity = this.hass.states[entities[0]];
      }
      
      if (entity) {
          // 根据用户选择的油品类型获取对应值
          const attributes = entity.attributes;
          let selectedFuelType = null;
          let selectedValue = null;
          
          // 检查用户选择的油品类型，按优先级选择
          if (this.config.show_gasoline98 === true && attributes['98#汽油']) {
            selectedFuelType = '98#汽油';
            selectedValue = attributes['98#汽油'];
          } else if (this.config.show_gasoline95 === true && attributes['95#汽油']) {
            selectedFuelType = '95#汽油';
            selectedValue = attributes['95#汽油'];
          } else if (this.config.show_gasoline92 === true && attributes['92#汽油']) {
            selectedFuelType = '92#汽油';
            selectedValue = attributes['92#汽油'];
          } else if (this.config.show_gasoline89 === true && attributes['89#汽油']) {
            selectedFuelType = '89#汽油';
            selectedValue = attributes['89#汽油'];
          } else if (this.config.show_diesel === true && attributes.柴油) {
            selectedFuelType = '柴油';
            selectedValue = attributes.柴油;
          }
          
          if (selectedValue !== null) {
            displayValue = parseFloat(selectedValue);
            displayUnit = '元';
          } else {
            // 如果没有找到任何选中的油品类型，显示提示信息
            displayValue = '未选择';
            displayUnit = '';
          }
        } else  {
          displayValue = '实体未找到';
          displayUnit = '';
        }
    }
    
    // 格式化显示值
    let formattedDisplayValue;
    if (typeof displayValue === 'number') {
      formattedDisplayValue = displayValue.toFixed(decimalPrecision);
      // 移除末尾多余的0
      formattedDisplayValue = parseFloat(formattedDisplayValue).toString();
    } else {
      formattedDisplayValue = displayValue;
    }
    
    // 构建显示文本
    const displayText = formattedDisplayValue !== null && displayUnit ? `${formattedDisplayValue}${displayUnit}` : formattedDisplayValue;
    const iconColor = lockWhiteFg ? 'rgb(255, 255, 255)' : fgColor;
    // 渲染按钮
    const buttonHtml = html`
      <div class="balance-status" style="--fg-color: ${fgColor}; --bg-color: ${buttonBgColor};" @click=${this._handleButtonClick}>
      ${!hideIcon ? html`<ha-icon class="status-icon" style="color: ${iconColor};" icon="${buttonIcon}"></ha-icon>` : ''}
        <span style="color: ${iconColor};">${displayText}</span>
      </div>
    `;

    // 返回最终的渲染结果（包括按钮和预览卡片）
    return html`
      ${buttonHtml}
      ${showPreview ? html`
      <div class="form-group">
        <label>👇👇👇下面是弹出卡片内容👇👇👇</label>
      </div>

      <ha-card style="--fg-color: ${fgColor}; --bg-color: ${bgColor};">
        <div class="card-header">
          <div class="card-title">
            <span class="offline-indicator" style="background: rgb(255,165,0); animation: pulse 2s infinite"></span>
            中国油价信息
          </div>
        </div>
        
        <div class="devices-list">
          ${this._loading ? 
            html`<div class="loading">加载中...</div>` :
            
            this._oilPriceData.length === 0 ? 
              html`<div class="no-devices">请配置油价实体</div>` :
              html`
                ${this._oilPriceData.map(oilData => html`
                  <div class="section-divider">
                    <div class="section-title">
                      <span>${oilData.province}：<span style="color: ${this._getPriceColor(oilData.expected_adjustment)}">${oilData.expected_adjustment}</span></span>
                    </div>
                  </div>
                  <div class="device-item" @click=${() => this._handleEntityClick(oilData)}>
                    <div class="device-info">
                      <div class="device-details">
                        <ha-icon icon="mdi:gas-station"></ha-icon> 92#: ¥${oilData.gasoline92}&emsp;<ha-icon icon="mdi:gas-station"></ha-icon> 95#: ¥${oilData.gasoline95}&emsp;<ha-icon icon="mdi:gas-station"></ha-icon> 98#: ¥${oilData.gasoline98}&emsp;<ha-icon icon="mdi:gas-station"></ha-icon> 柴油: ¥${oilData.diesel}
                      </div>
                      <div class="device-details">
                        ${oilData.next_adjustment_time} - ${oilData.next_adjustment_price}
                      </div>
                      <div class="device-details" style="color: ${this._getPriceColor(oilData.price_trend)}">
                        ${oilData.price_trend}
                      </div>
                    </div>
                  </div>
                `)}
              `
          }
        </div>
      </ha-card>
      ` : html``}
    `;
     /*button新元素 结束*/
  }

  setConfig(config) {
    /*button新元素 开始*/
    // 不设置默认值，只有明确配置时才添加 no_preview
    this.config = {
      ...config
    };
    if (config.button_width) {
      this.style.setProperty('--button-width', config.button_width);
    } else {
      this.style.setProperty('--button-width', '65px');
    }
    
    // 设置按钮高度（只控制 balance-status）
    if (config.button_height) {
      this.style.setProperty('--button-height', config.button_height);
    } else {
      this.style.setProperty('--button-height', '24px');
    }
    
    // 设置按钮文字大小（只控制 balance-status）
    if (config.button_font_size) {
      this.style.setProperty('--button-font-size', config.button_font_size);
    } else {
      this.style.setProperty('--button-font-size', '11px');
    }
    
    // 设置按钮图标大小（只控制 balance-status）
    if (config.button_icon_size) {
      this.style.setProperty('--button-icon-size', config.button_icon_size);
    } else {
      this.style.setProperty('--button-icon-size', '13px');
    }
    
    // 设置卡片宽度（控制原来的 UI）
    if (config.width) {
      this.style.setProperty('--card-width', config.width);
    } else {
      this.style.setProperty('--card-width', '100%');
    }
    
    /*button新元素 结束*/

    if (config.theme) {
      this.setAttribute('theme', config.theme);
    }
  }

  getCardSize() {
    // 根据油价实体数量动态计算卡片大小
    const baseSize = 3;
    const entitySize = Math.max(0, Math.min(this._oilPriceData.length * 2, 10));
    return baseSize + entitySize;
  }
}
customElements.define('xiaoshi-petrochina-button', PetroChinaButton);

const loadCards = async () => {
    window.customCards = window.customCards || [];
    window.customCards.push(...cardConfigs);
};

const cardConfigs = [
  {
    type: 'xiaoshi-petrochina-card',
    name: '中国油价信息卡片',
    description: '中国油价信息卡片',
    preview: true
  },
  {
    type: 'xiaoshi-petrochina-button',
    name: '中国油价信息按钮',
    description: '中国油价信息按钮',
    preview: true
  }
];

loadCards();
