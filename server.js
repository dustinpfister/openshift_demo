#!/bin/env node

//  OpenShift_demo using express 4.13.3... Maybe if it works

var express = require('express'),
app = express(),

// to hold any openshift stuff, like environment variables.
openShift = {};

//  Set the environment variables we need.
openShift.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
openShift.port = process.env.OPENSHIFT_NODEJS_PORT || 8080;

// if offline
if (typeof openShift.ipaddress === "undefined") {

    console.warn('Working offline? , using 127.0.0.1');
    openShift.ipaddress = "127.0.0.1";
};


app.get('/', function(req, res){
  res.send('<h1>hello i am dustins openshift_demo app working at openshift</h1>');
});

app.listen(openShift.port, openShift.ipaddress);