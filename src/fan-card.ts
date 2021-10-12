/* eslint-disable @typescript-eslint/no-explicit-any */
import { RippleHandlers } from "@material/mwc-ripple/ripple-handlers";
import { Ripple } from '@material/mwc-ripple';
import {
  LitElement,
  html,
  TemplateResult,
  css,
  PropertyValues,
  CSSResultGroup,
} from 'lit';


import { HassEntity } from 'home-assistant-js-websocket'
import { queryAsync } from 'lit-element'
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { classMap } from "lit/directives/class-map";
//import { styleMap } from "lit/directives/style-map";
import {
  HomeAssistant,
  hasConfigOrEntityChanged,
  hasAction,
  ActionHandlerEvent,
  handleAction,
  LovelaceCardEditor,
  getLovelace,
  computeStateDomain,
  // computeStateDisplay,
  // FrontendTranslationData,
} from 'custom-card-helpers'; // This is a community maintained npm module with common helper functions/types. https://github.com/custom-cards/custom-card-helpers

import './editor';
import type { BoilerplateCardConfig } from './types';
import { actionHandler } from './action-handler-directive';
import { CARD_VERSION } from './const';
import { localize } from './localize/localize';
//import { iconColorCSS } from "../../../common/style/icon_color_css";

/* eslint no-console: 0 */
console.info(
  `%c  RACELAND-FAN-CARD \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'fan-card',
  name: 'fan-card',
  description: 'A template custom card for you to create something awesome',
});

// TODO Name your custom element
@customElement('fan-card')
export class BoilerplateCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('fan-card-editor');
  }

  @queryAsync('mwc-ripple') private _ripple!: Promise<Ripple | null>;

  public static getStubConfig(): object {
    return {};
  }

  // TODO Add any properities that should cause your element to re-render here
  // https://lit.dev/docs/components/properties/
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private config!: BoilerplateCardConfig;

  // https://lit.dev/docs/components/properties/#accessors-custom
  public setConfig(config: BoilerplateCardConfig): void {
    // TODO Check for required fields and that they are of the proper format
    if (!config) {
      throw new Error(localize('common.invalidconfiguration'));
    }

    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }

    this.config = {
      show_icon: true,
      icon: 'mdi:fan',
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


  // https://lit.dev/docs/components/lifecycle/#reactive-update-cycle-performing
  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }

    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  // https://lit.dev/docs/components/rendering/
  protected render(): TemplateResult | void {
    // TODO Check for stateObj or other necessary things and render a warning if missing
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
        .label=${`fan: ${this.config.entity || 'No Entity Defined'}`}
      >
      ${this.config.show_icon
          ? html`
              <ha-icon
                class="fan-icon ${classMap({
                 "state-on": ifDefined(
                   stateObj ? this.computeActiveState(stateObj) : undefined) === "on",
                  "state-off": ifDefined(
                   stateObj ? this.computeActiveState(stateObj) : undefined) === "off",
                  "state-unavailable": ifDefined(
                   stateObj ? this.computeActiveState(stateObj) : undefined) === "unavailable"
               })}"
                tabindex="-1"
                data-domain=${ifDefined(
                  this.config.state_color && stateObj
                    ? computeStateDomain(stateObj)
                    : undefined
                )}
                data-state=${ifDefined(
                  stateObj ? this.computeActiveState(stateObj) : undefined
                )}
                .icon=${this.config.icon}

              ></ha-icon>

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
      ${this.translate_state(stateObj)

      }
      <div class="position"></div>
     </div>
     `
    : ""}
    <div>

    </div>


    <!-- É criado este código para transformar o texto debaixo da "Fan" em "On" e "Off" -->
    <!-- A ordem foi trocada para garantir que o "On" e "Off" estão debaixo do nome da "Fan" -->




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
        /* Deixa ficar os 100% para a width and height, altera nas outras cartas para 100% também.
        não mexas aqui para ficar mais pequeno, é noutro sítio */
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
        /* border: 2px solid #73AD21; */
        height: 100%;
        padding: 0px 0px 0px 0px;
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
        /* padding: 100px 0px 100px 0px; */
        /* border: 2px solid #73AD21; */
        padding: 0px 0px 0px 0px;
        text-align: left;
        width: 100%;
      }
      .name-div {
        /* border: 2px solid #73AD21; */
        padding: 10% 0px 0px 0px;
        text-align: left;
        width: 100%;
      }
      .fan-icon.state-on {
        color: var(--paper-item-icon-active-color, #fdd835);
        animation: rotate 9s linear;
        animation-delay: 0s;
        animation-iteration-count: infinite;
      }
      .fan-icon.state-unavailable {
        color: var(--state-icon-unavailable-color, #bdbdbd);
      }
      @keyframes rotate {
        0% {
          transform: rotate(0deg);
        }
        25% {
          transform: rotate(360deg);
        }
        50% {
          transform: rotate(720deg);
        }
        75% {
          transform: rotate(1080deg);
        }
        100% {
          transform: rotate(1440deg);
        }
      }
      .state {
        font-size: 0.9rem;
        color: var(--secondary-text-color);
      }
    `;
  }
}
