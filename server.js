 const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const Datastore = require('nedb');

const app = express();
const db = new Datastore({ filename: './snapshots.db', autoload: true });

app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static('public')); // Your front-end files go in a 'public' folder

// 1. Get the latest version of the page
app.get('/api/page/latest', (req, res) => {
    db.find({}).sort({ timestamp: -1 }).limit(1).exec((err, docs) => {
        if (docs.length > 0) res.send(docs[0]);
        else res.status(404).send({ error: "No snapshots found" });
    });
});

// 2. Save a new Snapshot
app.post('/api/page/save', (req, res) => {
    const snapshot = {
        html: req.body.html,
        css: req.body.css,
        components: req.body.components, // GrapeJS specific JSON
        timestamp: new Date(),
        versionName: `Update ${new Date().toLocaleString()}`
    };

    db.insert(snapshot, (err, newDoc) => {
        if (err) res.status(500).send(err);
        else res.send({ message: "Snapshot saved successfully!", id: newDoc._id });
    });
});

// 3. Get all snapshots (for the version list)
app.get('/api/snapshots', (req, res) => {
    db.find({}).sort({ timestamp: -1 }).exec((err, docs) => {
        res.send(docs);
    });
});

// 4. Load a specific version
app.get('/api/page/:id', (req, res) => {
    db.findOne({ _id: req.params.id }, (err, doc) => {
        res.send(doc);
    });
});

app.listen(3000, () => console.log('Admin Backend running on http://localhost:3000'));