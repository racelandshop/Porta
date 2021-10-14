import { RippleHandlers } from "@material/mwc-ripple/ripple-handlers";
import { Ripple } from '@material/mwc-ripple';
import { LitElement, html, TemplateResult, css, PropertyValues, CSSResultGroup} from 'lit';
import { HassEntity } from 'home-assistant-js-websocket'
import { queryAsync } from 'lit-element'
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { classMap } from "lit/directives/class-map";
import { HomeAssistant, hasConfigOrEntityChanged, hasAction, ActionHandlerEvent, handleAction, LovelaceCardEditor, getLovelace, computeStateDomain} from 'custom-card-helpers';
import './editor';
import type { BoilerplateCardConfig } from './types';
import { actionHandler } from './action-handler-directive';
import { CARD_VERSION } from './const';
import { localize } from './localize/localize';

const room = "M11.4,1.4h27.2v43.1H11.4V1.4z";
const door = "M11.4 1.4v43.1h27.2V1.4H11.4zm23 23.4c0 1.1-.9 1.9-1.9 1.9h0c-1.1 0-1.9-.9-1.9-1.9V21c0-1.1.9-1.9 1.9-1.9h0c1.1 0 1.9.9 1.9 1.9v3.8z";
const garageClosed = "M19,12H16V14H8V12M8,15H16V17H8V15M16,18V20H8V18H16Z";
const garageOpen = "M19,20H17V11H7V20H5V9L12,5L19,9V20M8";

console.info(
  `%c  RACELAND-porta-card \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'porta-card',
  name: 'Porta / Garagem',
  description: "Uma carta customizada da Porta e Garagem",
});
@customElement('porta-card')
export class BoilerplateCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('porta-card-editor');
  }

  @queryAsync('mwc-ripple') private _ripple!: Promise<Ripple | null>;

  public static getStubConfig(): object {
    return {
      "type": "custom:porta-card",
      "entity": "switch.raceland",
      "show_name": true,
      "show_state": true,
      "name": "raceland"
    };
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
          <!-- ${console.log("ICON", (JSON.stringify(this.config.icon )==JSON.stringify([room, door])))} -->
            <svg viewBox="0 0 50 50" height="100%" width="100%">
              <path fill="#ffffff" d=${this.config.icon[0]} />
              <path class=${classMap({
                "state-on-porta-icon":
                    ifDefined(stateObj? this.computeActiveState(stateObj) : undefined) === "on" && (JSON.stringify(this.config.icon )==JSON.stringify([room, door])),
                  "state-off-porta-icon":
                  ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "off" && (JSON.stringify(this.config.icon )==JSON.stringify([room, door])),
                  "state-on-garagem-icon":
                    ifDefined(stateObj? this.computeActiveState(stateObj) : undefined) === "on" && (JSON.stringify(this.config.icon )==JSON.stringify([garageOpen, garageClosed])),
                  "state-off-garagem-icon":
                  ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "off" && (JSON.stringify(this.config.icon )==JSON.stringify([garageOpen, garageClosed])),
                "state-unavailable":
                  ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "unavailable",
              }
                  )
              }
              fill="#b68349" d=${this.config.icon[1]} />

            </svg>

            `
    : ""}
    <div>

    </div>
    ${this.config.show_name
    ? html`
      <div tabindex = "-1" class="name-div">
      ${this.config.name}
        </div>
      `
    : ""}
    <div>

    </div>

    ${this.config.show_state
    ? html`
      <div tabindex="-1" class="state-div">
      ${this.translate_state(stateObj)}
      <div class="position"></div>
     </div>`: ""}
    <div>

    </div>
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
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 4% 0;
        font-size: 1.2rem;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        justify-content: center;
        position: relative;
        background: rgba(120,120,120,0.7);
        color: white;
        border-radius: 25px;
        padding-left: 10%;
      }

      ha-card:focus {
        outline: solid;
        outline-color: white;
      }

      ha-icon {
        width: 50%;
        height: 100%;
        padding: 0px 0px 0px 80px;
        color: var(--paper-item-icon-color, #44739e);
        --mdc-icon-size: 100%;
      }

      ha-icon + span {
        margin-top: 3%;
        margin-bottom: 10%;
      }

      ha-icon,
      span {
        outline: none;
      }

      .hassbut.state-on {
        background: rgba(255,255,255,0.7);
        color: black;
      }

      .hassbut {
        display: grid;
        grid-template-columns: 50% 50%;
      }

      .state-div {
        border: 2px solid #73AD21;
        padding: 0px 0px 0px 0px;
        text-align: left;
        width: 50%;
      }

      .name-div {
        padding: 10% 0px 0px 0px;
        text-align: left;
        width: 100%;
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
        transition: all 0.5s ease-out;
        fill: #a2743f;
      }
      .state-on-garagem-icon {
        /* transform: skewY(10deg) translate(-4.5%, 3.9%) scaleX(-0.8); */
        /* transition: all 0.5s ease-out; */
        transition: max-height 0.8s;
        transform: translate(0, -14.5%);
        fill: #ffffff;
      }
      .state-off-garagem-icon {
        /* transform: skewY(10deg) translate(4.5%, -3.9%) scaleX(0.8); */
        transition: all 0.8s ease-out;
        fill: #ffffff;
      }

      .opacity {
        animation: opacity 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
      }

      .reverse {
        animation-direction: reverse;
      }

      .porta-icon.state-unavailable {
        color: var(--state-icon-unavailable-color, #bdbdbd);
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
