#!/bin/env node

/*    OpenShift_demo by Dustin Pfister
 *    https://github.com/dustinpfister/openshift_demo
 *
 *    A simple openshift.com demo app using express, and mongoose.
 */

var express = require('express'),
    mongoose = require('mongoose'),
    os_count = require('./os_count.js'),
    openShift = require('./openshift.js').openShiftObj,

    // express app
    app = express(),

// mongoose
//var db = mongoose.connect(openShift.mongo),
db = mongoose.createConnection(openShift.mongo),
    Schema = mongoose.Schema,
    simpleCount = db.model('simplecount', new Schema({
        id: String,
        count: Number

    })),
    iplogger = db.model('iplogger', new Schema({

        ip: String, // the ip address
        visitCount: Number, // visit count from that ip


        userAgents: [ // list of user agents from that ip

            new Schema({

                userAgentString: String, // the user agent string
                visitCount: Number // number of visits from the ip with this user agent

            })

        ]


    })),


    findAgent = function(log, userAgent) {

        var agents = log.userAgents,
            i = 0;

        while (i < agents.length) {

            if (agents[i].userAgentString === userAgent) {

                return agents[i];

            }

            i++;
        }

        return false;

    };

// trust proxy
app.enable('trust proxy');

// lets try EJS
app.set('view engine', 'ejs');
app.use(require('express-ejs-layouts'));
app.use(express.static('views')); // must do this to get external files

// root path get requests
app.get('/', function(req, res) {

    var newInfo,
        displayCount = 0,
        userIP = req.ip,
        userAgent = req.get('user-agent'),
        userAgentVisit = 0,
        agent, html, i;

    // find record for ip address
    iplogger.findOne({
        'ip': userIP
    }, '', function(err, log) {

        // if there is a log for the ip
        if (log) {

            // bump ip level count
            log.visitCount += 1;

            var agent = findAgent(log, userAgent);

            if (agent) {


                agent.visitCount += 1;

                console.log('bumping count for user agent: ' + agent.visitCount);

                userAgentVisit = agent.visitCount;

            } else {

                console.log('new user agent for ip: ' + log.ip);
                log.userAgents.push({
                    userAgentString: userAgent,
                    visitCount: 1
                });

                userAgentVisit = 1;

            }

            // save / update log
            log.save(function() {

                console.log('visit # ' + log.visitCount + ' from ipaddress: ' + log.ip + ' logged!');

            });

            // else there is not a log, so make one
        } else {

            log = new iplogger({

                ip: userIP,
                visitCount: 1,
                userAgents: []

            });

            log.userAgents.push({
                userAgentString: userAgent,
                visitCount: 1
            });

            log.save(function() {

                console.log('new ip record!');

            });

        }


        // find count
        simpleCount.findOne({
            'id': 'main'
        }, '', function(err, count) {

            // if found add to count
            if (count) {

                count.count += 1;
                displayCount = count.count;

                count.save(function() {

                    console.log('new count saved');

                });

                // set up new record
            } else {

                newInfo = new simpleCount({
                    id: 'main',
                    count: 1
                });
                newInfo.save(function() {

                    console.log('saved new count');

                });

                displayCount = 1;

            }


            agent = log.userAgents, html = '', i = 0;
            while (i < agent.length) {
                html += '<ul><li>' + agent[i].userAgentString + ' </li><li>' + agent[i].visitCount + '</li></ul>';;
                i++;
            }

            // render ejs
            res.render('demo_root',{
                displayCount : displayCount,
                ipCount : os_count.getIPCount(),
                os_stats: os_count.makeHTML(),
                clientIP : log.ip,
                clientVisit : log.visitCount,
                clientUA : html
            });


        });


    });


});

// start server
app.listen(openShift.port, openShift.ipaddress);

// run update loop
os_count.startUpdate();