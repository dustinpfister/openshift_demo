#!/bin/env node

/*    OpenShift_demo by Dustin Pfister
 *    https://github.com/dustinpfister/openshift_demo
 *
 *    A simple openshift.com demo app using express, and mongoose.
 */

var express = require('express'),
mongoose = require('mongoose'),

// express app
app = express(),

// to hold any openshift stuff, like environment variables.
openShift = {};

//  Set the environment variables we need.
openShift.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
openShift.port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
openShift.mongo = 'mongodb://localhost/openshift_demo'; // default to local

// if offline
if (typeof openShift.ipaddress === "undefined") {

    console.warn('Working offline? , using 127.0.0.1');
    openShift.ipaddress = "127.0.0.1";

};

// mongo on openshift?
// if OPENSHIFT env variables are present, use the available connection info:
if(process.env.OPENSHIFT_MONGODB_DB_PASSWORD){

    openShift.mongo = process.env.OPENSHIFT_MONGODB_DB_USERNAME + ":" +
    process.env.OPENSHIFT_MONGODB_DB_PASSWORD + "@" +
    process.env.OPENSHIFT_MONGODB_DB_HOST + ':' +
    process.env.OPENSHIFT_MONGODB_DB_PORT + '/' +
    process.env.OPENSHIFT_APP_NAME;

}

// mongoose
var db = mongoose.connect(openShift.mongo),
Schema = mongoose.Schema,
simpleCount = db.model('simplecount', new Schema({

    id: String,
    count: Number

})),
iplogger = db.model('iplogger', new Schema({

    ip: String,                  // the ip address
    visitCount: Number,       // visit count from that ip

/*
    userAgents: [             // list of user agents from that ip
        
        new Schema({

            userAgentString : String,   // the user agent string
            visitCount : Number         // number of visits from the ip with this user agent

        })

    ]
*/

}));

// root path get requests
app.get('/', function(req, res){

    var newInfo, 
    displayCount = 0,
    userIP = req.connection.remoteAddress;

    // find record for ip address
    iplogger.findOne({'ip': userIP}, '', function(err, log){

        // if there is a log for the ip
        if(log){

            log.visitCount += 1;
            log.save(function(){

                console.log('visit # '+ log.visitCount + ' from ipaddress: ' + log.ip + ' logged!');

            });

        // else there is not a log, so make one
        }else{

            log = new iplogger({

                ip : userIP,
                visitCount : 1

            });

            log.save(function(){

                console.log('new ip record!');

            });

        }


        // find count
        simpleCount.findOne({'id':'main'}, '', function(err, count){

            // if found add to count
            if(count){

                count.count += 1;
                displayCount = count.count;

                count.save(function(){

                    console.log('new count saved');

                });

            // set up new record
            }else{

                newInfo = new simpleCount({id: 'main', count: 1});
                newInfo.save(function(){

                    console.log('saved new count');

                });

                displayCount = 1;

            }
        
            //  send simple demo message, with visiter count.
            res.send( ' <h1>hello i am dustins openshift_demo app working at openshift</h1>'+
            '<p> You are visiter #: '+ displayCount + '</p>'+
            '<p> Hello visiter from ip: ' + log.ip + ' this is the ' + log.visitCount + ' visit i have logged from this ip address.</p>');

        });


    });


});

// start server
app.listen(openShift.port, openShift.ipaddress);