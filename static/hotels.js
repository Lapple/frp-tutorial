var EventEmitter = require('events').EventEmitter;

var $ = require('jquery');
var Rx = require('rx');
var gmaps = require('google-maps');
var Handlebars = require('handlebars');

require('handlebars-helper-repeat').register(Handlebars);

$(function() {
    var $mapContainer = $('.js-map');
    var $hotelsList = $('.js-list');
    var events = new EventEmitter();

    var hotelsTemplate = Handlebars.compile($('#hotels-template').html());

    gmaps.KEY = 'AIzaSyA6bCy1qdtH0Um4yD383F5ZmIymQqTuAsw';
    gmaps.SENSOR = false;

    gmaps.load(function(google) {
        var maps = google.maps;
        var markers;

        // Create map instance.
        var map = new maps.Map($mapContainer[0], {
            center: new maps.LatLng(52.366667, 4.9),
            zoom: 8
        });

        // Update UI whenever active hotel changes.
        events.on('active', function(title) {
            setActiveMarker(title);
            setActiveItem(title);
        });

        function renderHotelMarkers(hotels) {
            clearMarkers();
            hotels.forEach(createMarker);
        }

        function renderHotelsList(hotels) {
            $hotelsList.html(hotelsTemplate({ hotels: hotels }));
        }

        function clearMarkers() {
            if (Array.isArray(markers)) {
                markers.forEach(function(marker) {
                    maps.event.removeListener(marker._onClick);
                    marker.setMap(null);
                });
            }

            markers = [];
        }

        function createMarker(hotel) {
            var marker = new maps.Marker({
                position: new maps.LatLng(hotel.lat, hotel.lng),
                map: map,
                icon: {
                    path: maps.SymbolPath.CIRCLE,
                    scale: 5
                },
                title: hotel.title
            });

            marker._onClick = maps.event.addListener(marker, 'click', function() {
                events.emit('active', hotel.title);
            });

            markers.push(marker);
        }

        function setActiveMarker(title) {
            markers.forEach(function(marker) {
                marker.setIcon({
                    path: maps.SymbolPath.CIRCLE,
                    scale: marker.getTitle() === title ? 10 : 5
                });
            });
        }

        function setActiveItem(title) {
            $hotelsList.children('.js-hotel').each(function(index, el) {
                var $el = $(el);
                $el.toggleClass('hotel_active', $el.attr('data-title') === title);
            });
        }

        // RxJS observables
        function subscribeToBoundsChange(cb) {
            maps.event.addListener(map, 'bounds_changed', cb);
        }

        function unsubscribeFromBoundsChange() {
            maps.event.clearListeners(map, 'bounds_changed');
        }

        function getBounds() {
            return map.getBounds();
        }

        function getHotelsRequestObservable(bounds) {
            var deferred = $.getJSON('/hotels', { box: bounds.toUrlValue() });
            return Rx.Observable.fromPromise(deferred);
        }

        function subscribeToListClicks(cb) {
            $hotelsList.on('click', '.js-hotel', cb);
        }

        function unsubscribeFromListClicks(cb) {
            $hotelsList.off('click', '.js-hotel', cb);
        }

        function getActiveFromListClick(args) {
            return args[0].currentTarget.getAttribute('data-title');
        }

        var boundsChange = Rx.Observable.fromEventPattern(subscribeToBoundsChange, unsubscribeFromBoundsChange);
        var bounds = boundsChange.map(getBounds).debounce(200);
        var hotels = bounds.flatMapLatest(getHotelsRequestObservable).share();

        var activeFromListClicks = Rx.Observable.fromEventPattern(subscribeToListClicks, unsubscribeFromListClicks, getActiveFromListClick);

        hotels.subscribe(renderHotelsList);
        hotels.subscribe(renderHotelMarkers);

        activeFromListClicks.subscribe(events.emit.bind(events, 'active'));
    });
});
