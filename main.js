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

const map = new Map({
  target: 'map-container',
  layers: [
    new TileLayer({
      source: new OSM({
        attributions: []
      }),
    }),
  ],
  view: new View({
    center: fromLonLat([105.8369637, 21.0227396]),
    zoom: 14,
    maxZoom: 20,
    minZoom: 10,
  }),
  controls: defaultControls().extend([new ZoomSlider()]),
});

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
  const zoomFactor = Math.min(zoomFactorWidth, zoomFactorHeight) / 4;  
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
