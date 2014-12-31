var $ = require('jquery');
var Rx = require('rx');
var gmaps = require('google-maps');
var Handlebars = require('handlebars');

require('handlebars-helper-repeat').register(Handlebars);

$(function() {
    var $mapContainer = $('.js-map');
    var $hotelsList = $('.js-list');

    var hotelsTemplate = Handlebars.compile($('#hotels-template').html());

    gmaps.KEY = 'AIzaSyA6bCy1qdtH0Um4yD383F5ZmIymQqTuAsw';
    gmaps.SENSOR = false;

    gmaps.load(function(google) {
        var maps = google.maps;

        // Create map instance.
        var map = new maps.Map($mapContainer[0], {
            center: new maps.LatLng(52.366667, 4.9),
            zoom: 8
        });

        function renderHotelMarkers(markers) {
            // Previous set of markers.
            markers[0].forEach(function(marker) {
                marker.setMap(null);
            });

            // New set of markers.
            markers[1].forEach(function(marker) {
                marker.setMap(map);
            });
        }

        function renderHotelsList(hotels) {
            $hotelsList.html(hotelsTemplate({ hotels: hotels }));
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

        function createMarkers(hotels) {
            return hotels.map(createMarker);
        }

        function createMarker(hotel) {
            return new maps.Marker({
                position: new maps.LatLng(hotel.lat, hotel.lng),
                icon: {
                    path: maps.SymbolPath.CIRCLE,
                    scale: 5
                },
                title: hotel.title
            });
        }

        function collectMarkerClicks(markers) {
            var s = new Rx.BehaviorSubject();

            // Previous set of markers.
            markers[0].forEach(function(marker) {
                maps.event.clearListeners(marker, 'click');
            });

            // New set of markers.
            markers[1].forEach(function(marker) {
                maps.event.addListener(marker, 'click', function() {
                    s.onNext(marker.getTitle());
                });
            });

            return s;
        }

        function isString(value) {
            return typeof value === 'string';
        }

        var boundsChange = Rx.Observable.fromEventPattern(subscribeToBoundsChange, unsubscribeFromBoundsChange);
        var bounds = boundsChange.map(getBounds).debounce(200);
        var hotels = bounds.flatMapLatest(getHotelsRequestObservable).share();
        var markers = hotels.map(createMarkers).share();
        var bufferedMarkers = markers.startWith([]).bufferWithCount(2, 1);

        var activeFromListClicks = Rx.Observable.fromEventPattern(subscribeToListClicks, unsubscribeFromListClicks, getActiveFromListClick);
        var activeFromMarkerClicks = bufferedMarkers.flatMapLatest(collectMarkerClicks).filter(isString);
        var active = Rx.Observable.merge(activeFromListClicks, activeFromMarkerClicks);

        hotels.subscribe(renderHotelsList);
        bufferedMarkers.subscribe(renderHotelMarkers);
        active.subscribe(setActiveItem);
    });
});
