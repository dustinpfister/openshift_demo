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


    userAgents: [             // list of user agents from that ip
        
        new Schema({

            userAgentString : String,   // the user agent string
            visitCount : Number         // number of visits from the ip with this user agent

        })

    ]


})),


findAgent = function(log, userAgent){

    var agents = log.userAgents,
    i = 0;

    while(i < agents.length){

        if(agents[i].userAgentString === userAgent){

            return agents[i];

         }

         i++;
    }

    return false;
        
}

// root path get requests
app.get('/', function(req, res){

    var newInfo, 
    displayCount = 0,
    userIP = req.connection.remoteAddress,
    userAgent = req.get('user-agent'),
    userAgentVisit = 0;

    // find record for ip address
    iplogger.findOne({'ip': userIP}, '', function(err, log){

        // if there is a log for the ip
        if(log){

            // bump ip level count
            log.visitCount += 1;

            var agent = findAgent(log, userAgent);

            if(agent){

                
                agent.visitCount += 1;

                console.log('bumping count for user agent: '+ agent.visitCount);

                userAgentVisit = agent.visitCount;

            }else{

                console.log('new user agent for ip: ' + log.ip);
                log.userAgents.push({
                    userAgentString: userAgent,
                    visitCount: 1
                });

                userAgentVisit = 1;

            }

            // save / update log
            log.save(function(){

                console.log('visit # '+ log.visitCount + ' from ipaddress: ' + log.ip + ' logged!');

            });

        // else there is not a log, so make one
        }else{

            log = new iplogger({

                ip : userIP,
                visitCount : 1,
                userAgents: []
            });

            log.userAgents.push({
                userAgentString: userAgent,
                visitCount: 1
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
        
           var agent = log.userAgents, html='',i=0;


           while(i < agent.length){

               html += '<ul><li>'+agent[i].userAgentString + ' </li><li>' + agent[i].visitCount+'</li></ul>';;

               i++;
           }

            //  send simple demo message, with visiter count.
            res.send( ' <h1>hello i am dustins openshift_demo app working at openshift</h1><br><br>'+
            '<h2>Visit Count</h2>'+
            '<p> You are visiter #: '+ displayCount + '</p>'+
            '<p> Hello visiter from ip: ' + log.ip + ' i have a visit count of ' + log.visitCount + ' from this ip address.</p>'+
            '<h2> User agent history from this ip: </h2>'+
            html
            );

        });


    });


});

// start server
app.listen(openShift.port, openShift.ipaddress);