var genie = require('genie');
var range = require('range');
var express = require('express');

var app = express();

app.use(express.static(__dirname + '/static'));
app.get('/hotels', function(req, res) {
    var box = req.query.box.split(',');
    var template = {
        title: {
            pattern: 'companyName'
        },
        address: {
            pattern: 'streetAddress'
        },
        city: {
            pattern: 'city'
        },
        zip: {
            pattern: 'zipCode'
        },
        lat: random.bind(null, number(box[0]), number(box[2])),
        lng: random.bind(null, number(box[1]), number(box[3])),
        stars: {
            range: [2, 5]
        }
    };

    res.json(range(0, 20).map(genie.bind(null, template)));
});

app.listen(3000);
console.log('Listening on port %d', 3000);

function number(value) {
    return parseInt(value, 10);
}

function random(min, max) {
    return (Math.random() * (max - min)) + min;
}
