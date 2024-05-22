import OSM from 'ol/source/OSM';
import TileLayer from 'ol/layer/Tile';
import {Map, View} from 'ol';
import {fromLonLat} from 'ol/proj';
import ZoomSlider from 'ol/control/ZoomSlider.js';
import {defaults as defaultControls} from 'ol/control.js';
import {DragBox} from 'ol/interaction.js';
import { fromExtent } from 'ol/geom/Polygon';
import MousePosition from 'ol/control/MousePosition';
import { createStringXY } from 'ol/coordinate';
import TileWMS from 'ol/source/TileWMS';
import Overlay from 'ol/Overlay';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';

const meterWMSLayer = new TileLayer({
  source: new TileWMS({
      url: 'https://giscloud.vn/geoserver/globaltech_dev/wms',
      params: {
          'LAYERS': 'globaltech_dev:v_layer_customer_meter',
          'TILED': true,
          'FORMAT': 'image/png',
          'TRANSPARENT': true,
      },
      serverType: 'geoserver',
      crossOrigin: 'anonymous'
  })
});

const lineWMSLayer = new TileLayer({
  source: new TileWMS({
    url: 'https://giscloud.vn/geoserver/globaltech_dev/wms',
    params: {
        'LAYERS': 'globaltech_dev:v_layer_pipe_line',
        'TILED': true,
        'STYLES': 'line',
        'FORMAT': 'image/png',
        'TRANSPARENT': true,
    },
      serverType: 'geoserver',
      crossOrigin: 'anonymous'
  })
});

const osmLayer = new TileLayer({
  source: new OSM({
      attributions: []
  })
});

const highlightLayer = new VectorLayer({
  source: new VectorSource(),
  style: new Style({
      stroke: new Stroke({
          color: 'yellow',
          width: 2
      }),
      fill: new Fill({
          color: 'rgba(255, 255, 0, 0.5)'
      })
  })
});

const map = new Map({
  target: 'map-container',
  layers: [
    osmLayer,
    lineWMSLayer,
    meterWMSLayer,
    highlightLayer
  ],
  view: new View({
    center: fromLonLat([106.6838751, 20.8614455]),
    zoom: 14,
    maxZoom: 22,
    minZoom: 10,
  }),
  controls: defaultControls().extend([new ZoomSlider()]),
});

const popupElement = document.getElementById('popup');
if (!popupElement) {
  throw new Error('Popup element with id "popup" not found');
}

const popup = new Overlay({
    element: popupElement,
    positioning: 'top-left',
    stopEvent: false,
    offset: [0, -15]
});
map.addOverlay(popup);

// Display popup on click
map.on('singleclick', function (evt) {
    const viewResolution = map.getView().getResolution();
    const fetchFeatureInfo = (layer) => { 
    const url = layer.getSource().getFeatureInfoUrl(
        evt.coordinate, viewResolution, 'EPSG:3857',
        { 'INFO_FORMAT': 'application/json'}
    );

    if (url) {
      console.log('GetFeatureInfo URL:', url);
      fetch(url)
          .then(response => response.json())
          .then(data => { 
              if (data.features.length > 0) {
                  const feature = data.features[0];
                  const coordinate = evt.coordinate;
                  const info = `
                      <h3>${feature.id}</h3>
                      <ul>
                          ${Object.entries(feature.properties).map(([key, value]) => `<li>${key}: ${value}</li>`).join('')}
                      </ul>
                  `;
                  popupElement.innerHTML = info;
                  // popup.setPosition(coordinate);
                  const pixel = map.getPixelFromCoordinate(coordinate);
                  const adjustedPosition = adjustPopupPosition(popupElement, pixel);
                  popup.setPosition(map.getCoordinateFromPixel(adjustedPosition));
                  popupElement.style.display = 'block';

                  const format = new GeoJSON();
                  const features = format.readFeatures(data);
                  highlightLayer.getSource().clear();
                  highlightLayer.getSource().addFeatures(features);
              } else {
                  popupElement.style.display = 'none';
                  highlightLayer.getSource().clear();
              }
          })
          .catch(error => {
              console.error('Error fetching feature info:', error);
              popupElement.style.display = 'none';
              highlightLayer.getSource().clear();
          });
    }
  };
  fetchFeatureInfo(lineWMSLayer);
  fetchFeatureInfo(meterWMSLayer);
});

// Hide popup on map move
map.on('movestart', function () {
  popupElement.style.display = 'none';
  highlightLayer.getSource().clear();
});

function adjustPopupPosition(popupElement, coordinate) {
  const popupRect = popupElement.getBoundingClientRect();
  const mapRect = document.getElementById('map-container').getBoundingClientRect();

  const offsetX = 15;
  const offsetY = 15;

  let x = coordinate[0] + offsetX;
  let y = coordinate[1] + offsetY;

  if (x + popupRect.width > mapRect.width) {
      x = coordinate[0] - popupRect.width - offsetX;
  }
  if (y + popupRect.height > mapRect.height) {
      y = coordinate[1] - popupRect.height - offsetY;
  }

  return [x, y];
}

const mousePositionControl = new MousePosition({
  coordinateFormat: createStringXY(7), 
  projection: 'EPSG:4326', 
  target: 'mouse-position',
  undefinedHTML: '&nbsp;'
});

map.addControl(mousePositionControl);

  let zoomButtonClicked = false;
  
  const previousMapStates = [];
  const undoneMapStates = [];

  const zoomButton = document.createElement('button');
  zoomButton.innerHTML = '+';
  zoomButton.className = 'zoom-button ol-unselectable ol-control';
  zoomButton.addEventListener('click', function() {
  zoomButton.classList.toggle('active');
    zoomButtonClicked = true;
    map.addInteraction(dragBox);
  });

map.getViewport().appendChild(zoomButton);

const zoomOutButton = document.createElement('button');
zoomOutButton.innerHTML = '-';
zoomOutButton.className = 'zoom-out-button ol-unselectable ol-control';
zoomOutButton.addEventListener('click', function() {
  zoomOutButton.classList.toggle('active');
  const activeout = zoomOutButton.classList.contains('active');
    zoomButtonClicked = false;
    map.addInteraction(dragBox);
   });
map.getViewport().appendChild(zoomOutButton);

const moveButton = document.createElement('button');
moveButton.innerHTML = 'x';
moveButton.className = 'move-button';
moveButton.addEventListener('click', function() {
  moveButton.classList.toggle('active');
    map.removeInteraction(dragBox);
   });

map.getViewport().appendChild(moveButton);

const dragBox = new DragBox({
  condition: fromExtent,
  style: {
      strokeColor: 'blue',
      strokeWidth: 2,
      strokeDash: [10, 10]
  }
});

dragBox.on('boxend', function() {
  const extent = dragBox.getGeometry().getExtent();
  const currentExtent = map.getView().calculateExtent(map.getSize());
  const newExtent = [
    Math.max(extent[0], currentExtent[0]),
    Math.max(extent[1], currentExtent[1]),
    Math.min(extent[2], currentExtent[2]),
    Math.min(extent[3], currentExtent[3])
  ];

  const boxWidth = newExtent[2] - newExtent[0];
  const boxHeight = newExtent[3] - newExtent[1];
  const mapWidth = currentExtent[2] - currentExtent[0];
  const mapHeight = currentExtent[3] - currentExtent[1];
  const zoomFactorWidth = mapWidth / boxWidth;
  const zoomFactorHeight = mapHeight / boxHeight;
  const zoomFactor = Math.min(zoomFactorWidth, zoomFactorHeight) / 8;  
  const newZoom = map.getView().getZoom() - zoomFactor;
  const newCenter = [
    (newExtent[0] + newExtent[2]) / 2,
    (newExtent[1] + newExtent[3]) / 2
  ];

  if(zoomButtonClicked) {
    map.getView().fit(extent, {
      padding: [10, 10, 10, 10],
      duration: 200
    });
  } else {
    map.getView().animate({
      center: newCenter,
      zoom: newZoom,
      duration: 200
    });
  };
  const currentCenter = map.getView().getCenter().slice();
  const currentZoom = map.getView().getZoom();

  previousMapStates.push({
      center: currentCenter,
      zoom: currentZoom
  });
});

function revertToPreviousState() {
  const prevState = previousMapStates.pop();
  if (prevState) {
    undoneMapStates.push({
      center: map.getView().getCenter().slice(),
      zoom: map.getView().getZoom()
    });

    map.getView().animate({
      center: prevState.center,
      zoom: prevState.zoom,
      duration: 200
    });
  }
}

function moveToNextState() {
  const nextState = undoneMapStates.pop();
  if (nextState) {
    previousMapStates.push({
      center: map.getView().getCenter().slice(),
      zoom: map.getView().getZoom()
    });

    map.getView().animate({
      center: nextState.center,
      zoom: nextState.zoom,
      duration: 200
    });
  }
}

const backButton = document.createElement('button');
backButton.innerHTML = '<';
backButton.className = 'back-button ol-unselectable ol-control';
backButton.addEventListener('click', revertToPreviousState);
map.getViewport().appendChild(backButton);

const nextButton = document.createElement('button');
nextButton.innerHTML = '>';
nextButton.className = 'next-button ol-unselectable ol-control';
nextButton.addEventListener('click', moveToNextState);
map.getViewport().appendChild(nextButton);
