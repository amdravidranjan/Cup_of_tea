import type { IControl, MapLibreMap } from "maplibre-gl";

/**
 * Native MapLibre control for recentering the map to project boundaries.
 * Placed in the map's control stack (e.g. 'top-right') so it:
 * 1. Automatically stacks with NavigationControl and FullscreenControl with zero overlap.
 * 2. Remains visible and functional inside Fullscreen mode.
 */
export class RecenterControl implements IControl {
  private _map?: MapLibreMap;
  private _container?: HTMLDivElement;
  private _onRecenter: () => void;

  constructor(onRecenter: () => void) {
    this._onRecenter = onRecenter;
  }

  onAdd(map: MapLibreMap): HTMLElement {
    this._map = map;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "maplibregl-ctrl-icon";
    button.title = "Recenter map";
    button.setAttribute("aria-label", "Recenter map");
    button.style.display = "flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: auto; display: block;">
        <circle cx="12" cy="12" r="3" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
      </svg>
    `;
    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._onRecenter();
    });

    this._container.appendChild(button);
    return this._container;
  }

  onRemove(): void {
    if (this._container?.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._map = undefined;
  }
}
