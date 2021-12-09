/* eslint-disable @typescript-eslint/no-explicit-any */
import { RippleHandlers } from "@material/mwc-ripple/ripple-handlers";
import { Ripple } from '@material/mwc-ripple';
import { LitElement, html, TemplateResult, css, PropertyValues, CSSResultGroup} from 'lit';
import { HassEntity } from 'home-assistant-js-websocket'
import { queryAsync } from 'lit-element'
import { customElement, property, state } from "lit/decorators";
import { findEntities } from "./././find-entities";
import { ifDefined } from "lit/directives/if-defined";
import { classMap } from "lit/directives/class-map";
import { HomeAssistant, hasConfigOrEntityChanged, hasAction, ActionHandlerEvent, handleAction, LovelaceCardEditor, getLovelace, computeDomain} from 'custom-card-helpers';
import './editor';
import type { BoilerplateCardConfig } from './types';
import { actionHandler } from './action-handler-directive';
import { CARD_VERSION } from './const';
import { localize } from './localize/localize';

const room = "M11.4,1.4h27.2v43.1H11.4V1.4z";
const door = "M11.4 1.4v43.1h27.2V1.4H11.4zm23 23.4c0 1.1-.9 1.9-1.9 1.9h0c-1.1 0-1.9-.9-1.9-1.9V21c0-1.1.9-1.9 1.9-1.9h0c1.1 0 1.9.9 1.9 1.9v3.8z";
const garageClosed = "M19,20H17V11H7V20H5V9L12,5L19,9V20M8,12H16V14H8V12M8,15H16V17H8V15M16,18V20H8V18H16Z";
const garageOpen = "M19,20H17V11H7V20H5V9L12,5L19,9V20M8,12H16V14H8V12Z";
const sidegateClosed = "M15.867 25.984v6.774h18.07V19.21h-18.07Zm16.848-4.925v.617H17.09V20.44h15.625Zm0 2.464v.614H17.09v-1.23h15.625Zm0 2.461v.618H17.09v-1.23h15.625Zm0 2.465v.613H17.09v-1.23h15.625Zm0 2.461v.617H17.09v-1.23h15.625Zm0 0";
const sidegateOpen = "M7.324 12.563v4.68H0V33.25h50.047V17.242H42.48v-9.36h-6.105v24.876H13.43V7.883H7.324Zm0 0";

console.info(
  `%c  RACELAND-porta-card \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'porta-card',
  name: 'Porta',
  preview: true //IMPORTANTE
});
@customElement('porta-card')
export class BoilerplateCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('porta-card-editor');
  }

  @queryAsync('mwc-ripple') private _ripple!: Promise<Ripple | null>;

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): BoilerplateCardConfig {
    const includeDomains = ["switch"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains
    );
    return { type: "custom:porta-card", entity: foundEntities[0] || "", "show_name": true, "show_state": true, "name": "Raceland", "show_preview": true, "icon": [room, door]};
  }

  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private config!: BoilerplateCardConfig;
  public setConfig(config: BoilerplateCardConfig): void {
    if (!config) {
      throw new Error(localize('common.invalidconfiguration'));
    }
    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }

    this.config = {
      show_icon: true,
      icon: 'mdi:Door',
      ...config,
      tap_action: {
        action: "toggle",
      },
    };
  }

  public translate_state(stateObj): string{
    if(ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "on") {
      return localize("states.on");
    }
    else if(ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "off") {
      return localize("states.off");
    }
    else if(ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "unavailable") {
      return localize("states.unavailable");
    }
    else {
      return ""
    }
}

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }
    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  protected renderSwitch(param): string{
    switch(param) {
      case 'foo':
        return 'bar';
      default:
        return 'foo';
    }
  }

  protected render(): TemplateResult | void {
    if (this.config.show_warning) {
      return this._showWarning(localize('common.show_warning'));
    }
    if (this.config.show_error) {
      return this._showError(localize('common.show_error'));
    }
    const stateObj = this.config.entity
      ? this.hass.states[this.config.entity]
      : undefined;

  return html`
      <ha-card
        class="hassbut ${classMap({
          "state-on": ifDefined(
          stateObj ? this.computeActiveState(stateObj) : undefined) === "on",
        "state-off": ifDefined(
          stateObj ? this.computeActiveState(stateObj) : undefined) === "off",
      })}"
        @action=${this._handleAction}
        @focus="${this.handleRippleFocus}"
        .actionHandler=${actionHandler({
          hasHold: hasAction(this.config.hold_action),
          hasDoubleClick: hasAction(this.config.double_tap_action),
        })}
        tabindex="0"
        .label=${`porta: ${this.config.entity || 'No Entity Defined'}`}
      >
      ${this.config.show_icon
          ? html`
            <svg class=${classMap({
                "svgicon-door":
                  (JSON.stringify(this.config.icon) == JSON.stringify([room, door])),
                "svgicon-garagem":
                  (JSON.stringify(this.config.icon) == JSON.stringify([garageOpen, garageClosed])),
                "svgicon-sidegate":
                  (JSON.stringify(this.config.icon) == JSON.stringify([sidegateOpen, sidegateClosed])),
                }
                )
            }
              viewBox="0 0 50 50" height="75%" width="65%" >
              <path fill="#a9b1bc" d=${this.config.icon[0]} />
              <path class=${classMap({
                "state-on-porta-icon":
                  ifDefined(stateObj? this.computeActiveState(stateObj) : undefined) === "on" && (JSON.stringify(this.config.icon) ==JSON.stringify([room, door])),
                "state-off-porta-icon":
                  ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "off" && (JSON.stringify(this.config.icon) == JSON.stringify([room, door])),
                "state-on-garagem-icon":
                  ifDefined(stateObj? this.computeActiveState(stateObj) : undefined) === "on" && (JSON.stringify(this.config.icon)==JSON.stringify([garageOpen, garageClosed])),
                "state-off-garagem-icon":
                  ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "off" && (JSON.stringify(this.config.icon) == JSON.stringify([garageOpen, garageClosed])),
                "state-on-sidegate-icon":
                  ifDefined(stateObj? this.computeActiveState(stateObj) : undefined) === "on" && (JSON.stringify(this.config.icon)==JSON.stringify([sidegateOpen, sidegateClosed])),
                "state-off-sidegate-icon":
                  ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "off" && (JSON.stringify(this.config.icon) == JSON.stringify([sidegateOpen, sidegateClosed])),
                "state-unavailable":
                  ifDefined(stateObj? this.computeActiveState(stateObj) : undefined) === "unavailable",
              }
                  )
              }
              d=${this.config.icon[1]} />
            </svg>
            <div class="divibut"></div>
            `
    : ""}

    ${this.config.show_name
    ? html`
      <div tabindex = "-1" class="name-div">
      ${this.config.name}
        </div>
        <div></div>
      `
    : ""}

    ${this.config.show_state
    ? html`
      <div tabindex="-1" class="state-div">
      ${this.translate_state(stateObj)}
      <div class="position"></div>
     </div><div></div>`: ""}
      </ha-card>
    `;
  }

private computeActiveState = (stateObj: HassEntity): string => {
  const domain = stateObj.entity_id.split(".")[0];
  let state = stateObj.state;
  if (domain === "climate") {
    state = stateObj.attributes.hvac_action;
  }
  return state;
};

  private _handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this.config && ev.detail.action) {
      handleAction(this, this.hass, this.config, ev.detail.action);
    }
  }

  private _showWarning(warning: string): TemplateResult {
    return html`
      <hui-warning>${warning}</hui-warning>
    `;
  }

  private _showError(error: string): TemplateResult {
    const errorCard = document.createElement('hui-error-card');
    errorCard.setConfig({
      type: 'error',
      error,
      origConfig: this.config,
    });
    return html`
      ${errorCard}
    `;
  }

  private computeObjectId = (entityId: string): string =>
    entityId.substr(entityId.indexOf(".") + 1);

  private computeStateName = (stateObj: HassEntity): string =>
    stateObj.attributes.friendly_name === undefined
      ? this.computeObjectId(stateObj.entity_id).replace(/_/g, " ")
      : stateObj.attributes.friendly_name || "";

  private _rippleHandlers: RippleHandlers = new RippleHandlers(() => {
    return this._ripple;
  });

  private handleRippleFocus() {
    this._rippleHandlers.startFocus();
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        cursor: pointer;
        display: grid;
        flex-direction: column;
        align-items: left;
        text-align: left;
        padding: 10% 10% 10% 10%;
        font-size: 18px;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        justify-content: left;
        position: relative;
        background: var(--card-color-background, rgba(53,53,53,0.9));
        color: var(--card-color-text, white);
        border-radius: 25px;
        overflow: hidden;
      }

      ha-icon {
        width: 70%;
        height: 80%;
        padding-bottom: 15px;
        margin: 0% 0% 0% 0%;
        color: var(--paper-item-icon-color, #fdd835);
        --mdc-icon-size: 100%;
      }

      ha-icon + span {
        text-align: left;
      }

      span {
        margin: 5% 50% 1% 0%;
        padding: 0% 100% 1% 0%;
      }

      .divibut{
        padding-bottom: 0%;
        margin-bottom: 0%;
      }

      ha-icon,
      span {
        outline: none;
      }

      .state {
        margin: 0% 50% 5% 0%;
        padding: 0% 100% 5% 0%;
        text-align: left;
      }

      .hassbut.state-off {
        text-align: left;
      }

      .hassbut.state-on {
        text-align: left;
      }

      .hassbut {
        display: grid;
        grid-template-columns: 50% 50%;
      }

      .state-div {
        padding: 0% 100% 10% 0%;
        align-items: left;
      }

      .name-div {
        padding: 0% 100% 1% 0%;
        align-items: left;
      }

      .svgicon-door {
        padding-bottom: 20px;
        max-width: 170px;
      }

      .svgicon-garagem {
        padding-bottom: 20px;
        max-width: 170px;
        transform: translate(62%, 55%) scale(2.5);
      }

      .svgicon-sidegate {
        padding-left: 10px;
        padding-bottom: 20px;
        transform: scale(1.3);
      }

      .state {
        animation: state 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
      }

      .state-on-porta-icon {
        transform: skewY(10deg) translate(4.5%, -3.9%) scaleX(0.8);
        transition: all 0.5s ease-out;
        fill: #b68349;
      }

      .state-off-porta-icon {
        animation-direction: reverse;
        transition-timing-function: all 0.5s ease-out;
        fill: #a2743f;
      }

      .state-on-garagem-icon {
        transform: scale(0);
        fill: #ffffff;
      }

      .state-off-garagem-icon {
        fill: #a9b1bc;
      }

      .state-on-sidegate-icon {
        fill: #a9b1bc;
        transform: translate(15px);
        transition-timing-function: all 2s ease-out;
      }

      .state-off-sidegate-icon {
        fill: #a9b1bc;
        transform: translate(0px);
        transition-timing-function: all 2s ease-out;
      }

      .porta-icon.state-unavailable {
        color: var(--state-icon-unavailable-color, #bdbdbd);
      }

      .garagem-icon.state-unavailable {
        color: var(--state-icon-unavailable-color, #bdbdbd);
      }

      .sidegate-icon.state-unavailable {
        color: var(--state-icon-unavailable-color, #bdbdbd);
      }

      .opacity {
        animation: opacity 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
      }

      .reverse {
        animation-direction: reverse;
      }

      @keyframes state {
        0% {
          transform: none;
          fill: #9da0a2;
        }
        100% {
          transform: skewY(10deg) translate(4.5%, -3.9%) scaleX(0.8);
          fill: #b68349;
        }
      }

      @keyframes opacity {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
    `;
  }
}
