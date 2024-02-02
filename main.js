const api = 'https://track.indo2go.nl/api';
const mapStyle = 'https://tiles.locationiq.com/v3/streets/vector.json?key=pk.0f147952a41c555a5b70614039fd148b'
const startingPosition = [0, 0];
const startingZoom = 2;

let map, devices, positions, follow, markers;

markers = {};

window.addEventListener('DOMContentLoaded', () => {
    map = new maplibregl.Map({
        container: 'map',
        style: mapStyle,
        center: startingPosition,
        zoom: startingZoom,
    });
    map.addControl(new maplibregl.NavigationControl());
    map.on('load', async () => {
        console.log("Refreshing devices...");
        await refreshDevices();
        console.log("Refreshing positions...");
        await refreshPositions();
        console.log("Fitting bounds...");
        fitBounds();
        setInterval(async () => {
            await refreshPositions();
        }, 15000);
    });
});

async function refreshDevices() {
    const response = await fetch(`${api}/devices`, {
        headers: {
            Authorization: "Basic " + btoa("public" + ":" + "public"),
        },
    });
    if (response.ok) {
        const list = await response.json();
        devices = {};
        list.forEach((device) => devices[device.id] = device);
        displayDevices();
    } else {
        console.log(response.statusText);
    }
}

async function refreshPositions() {
    const response = await fetch(`${api}/positions`, {
        headers: {
            Authorization: "Basic " + btoa("public" + ":" + "public"),
        },
    });
    const list = await response.json();
    positions = {};
    list.forEach((position) => positions[position.id] = position);
    displayPositions();
}

function fitBounds() {
    const coordinates = Object.values(positions).map((position) => [position.longitude, position.latitude]);
    if (coordinates.length > 1) {
        const bounds = coordinates.reduce((bounds, item) => bounds.extend(item), new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
        const canvas = map.getCanvas();
        map.fitBounds(bounds, {
            padding: Math.min(canvas.width, canvas.height) * 0.1,
            duration: 0,
        });
    } else if (coordinates.length == 1) {
        map.jumpTo({
            center: [coordinates[0][0], coordinates[0][1]],
            zoom: Math.max(map.getZoom(), 10),
        });
    }
}

function displayDevices() {
    const list = document.getElementById('device-list');
    Object.values(devices).forEach((device) => {
        const button = document.createElement('button');
        button.id = 'button' + device.id;
        button.classList = 'device list-group-item list-group-item-action';
        button.innerText = device.name;
        button.onclick = () => {
            if (button.classList.contains('active')) {
                button.classList.remove('active');
                follow = undefined;
            } else {
                button.classList.add('active');
                follow = device;
            }
            const position = Object.values(positions).find((position) => position.deviceId == device.id);
            map.flyTo({
                center: [position.longitude, position.latitude],
                zoom: Math.max(map.getZoom(), 10),
            });
        }
        list.appendChild(button);
    });
}

function displayPositions() {
    Object.values(markers).forEach((marker) => {
        marker.remove();
    });
    markers = {};
    Object.values(positions).forEach((position) => {
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.backgroundImage = 'url("marker.png")';
        el.style.width = '64px';
        el.style.height = '64px';
        el.style.backgroundSize = 'cover';
    
        const popup = new maplibregl.Popup({offset: 32}).setText(
            devices[position.deviceId].name
        );
    
        const marker = new maplibregl.Marker({ element: el });
        marker.setLngLat([position.longitude, position.latitude]);
        marker.setPopup(popup);
        marker.addTo(map);
        markers[position.id] = marker;
    });
    if (follow) {
        const position = Object.values(positions).find((position) => position.deviceId == follow.id);
        map.flyTo({
            center: [position.longitude, position.latitude],
            zoom: Math.max(map.getZoom(), 10),
        });
    }
}
