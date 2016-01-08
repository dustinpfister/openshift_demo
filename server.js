#!/bin/env node

/*    OpenShift_demo by Dustin Pfister
 *    https://github.com/dustinpfister/openshift_demo
 *
 *    A simple openshift.com demo app using express, and mongoose.
 */

var express = require('express'),
mongoose = require('mongoose'),

ipCount = 0, // number of ip address logged

osPats = [
    {osName: 'Android', pat: /android/, color: 'orange' },
    {osName: 'Linux', pat: /linux/, color: 'yellow' },
    {osName: 'Windows', pat: /windows/, color: 'green' },

    {osName: 'total', color: 'black' },
    {osName: 'Other', color: 'grey' }

],

osCount = {
    //total : 0,
    //android : 0,
    //otherLinux : 0,
    //otherOS : 0
},
osReset = function(){

    osCount = {};
    osCount.total = {
        count: 0,
        color: 'black'
    }

},
osCountUA = function(UA){

    var i=0, len = osPats.length;

    osCount.total.count += 1;

    while(i < len){

        if(UA.toLowerCase().match(osPats[i].pat)){

            var osName = osPats[i].osName;
            if(osCount[osName] === undefined){
                osCount[osName] = {
                    count: 1,
                    color: osPats[i].color
                }
            }else{
               osCount[osName].count += 1;
            }

            break;

        }

        i++;

    }

    if(i === len){
        if(osCount['Other'] === undefined){
            osCount['Other'] = {
                count: 1,
                color: 'red'
            }
        }else{

            osCount['Other'].count += 1;

        }
    }

},

makeOSCountHTML = function(){

    var html = '<ul>';

    for(var os in osCount){
        html += '<li style="color:'+osCount[os].color+';">'+os + ' : ' + osCount[os].count+'</li>';
    }


    return html+'</ul>';

},

makeOSDivBar = function(){

    var html='';

    for(osName in osCount){
        if(osName !== 'total'){
            html += '<div style="display:inline-block; width:'+Math.floor(osCount[osName].count / osCount['total'].count * 400)+'px; height:30px; background:'+osCount[osName].color+';"></div>';
        }
    }

    return '<div style="width:400px;height:30px;background:#888888;">'+html+'</div>';;

},

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

    // use something local such as "127.0.0.1", "localhost", or something like "192.168.1.4"
    openShift.ipaddress = '192.168.1.4';
    console.warn('Working offline? , using '+openShift.ipaddress+' on port '+openShift.port);
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
        
};



// trust proxy
app.enable('trust proxy');

// root path get requests
app.get('/', function(req, res){

    var newInfo, 
    displayCount = 0,
    userIP = req.ip,
    userAgent = req.get('user-agent'),
    userAgentVisit = 0,
    agent, html, i;

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
        

           agent = log.userAgents, html='',i=0;
           while(i < agent.length){
               html += '<ul><li>'+agent[i].userAgentString + ' </li><li>' + agent[i].visitCount+'</li></ul>';;
               i++;
           }

            //  send simple demo message, with visiter count.
            res.send( ' <h1>hello i am dustins openshift_demo app working at openshift</h1><br><br>'+
            '<h2>Visit Count</h2>'+
            '<p> You are visiter #: '+ displayCount + '</p>'+

             '<h2>OS Count</h2>'+

             makeOSCountHTML() +
             makeOSDivBar()+


//             '<p style="color:#ffaa00;">Android: '+osCount.android+'</p>'+
//             '<p style="color:#ffff00;">Other Linux: '+osCount.otherLinux+'</p>'+
//             '<p style="color:#888888;">Other OS / Unkown: '+osCount.otherOS+'</p>'+
             
             //'<div style="width:300px; height:30px; background:#888888;">'+

//                 '<div style="display:inline-block; width:'+Math.floor(osCount.android / osCount.total * 300)+'px; height:30px; background:#ffaa00;"></div>'+
//                 '<div style="display:inline-block; width:'+Math.floor(osCount.otherLinux / osCount.total * 300)+'px; height:30px; background:#ffff00;"></div>'+

             //'</div>'+


            '<h2> unique ip count: </h2>'+
            '<p> I have logged '+ipCount+' unique ip address in my database.</p>'+
            '<p> req.get(\'host\'): '+req.get('host')+'</p>'+
            '<p> req.ip: '+req.ip+'</p>'+
            '<p> req.connection.remoteAddress: '+req.connection.remoteAddress+'</p>'+
            '<p> YOU are a visiter from the ip (log.ip from req.ip)  ' + log.ip + ', and i have a visit count of ' + log.visitCount + ' from this ip address.</p>'+
            '<h2> User agent history from this ip: </h2>'+
            html
            );

        });


    });


});

var update = function(){

    var i, a, aLen, agents;

    //  update every once in a while
    setTimeout(update, 10000);

    // update stuff
    iplogger.find(function(err, logs){

        // set the new ipCount
        ipCount = logs.length;
        
        i=0;

        // reset os count
        //osCount = {
      //      total : 0,
      //      android : 0,
      //      otherLinux : 0,
      //      otherOS : 0

        //};

        //osCount.total = 0;

        osReset();

        // find new OS count
        while(i < ipCount){

            agents = logs[i].userAgents;
            a = 0; aLen = agents.length;

            while(a < aLen){
                //console.log('    '+agents[a].userAgentString);

               // osCount.total += 1;

                osCountUA(agents[a].userAgentString);

/*
                // is linux?
                if(agents[a].userAgentString.toLowerCase().match(/linux/)){

                    // android?
                    if(agents[a].userAgentString.toLowerCase().match(/android/)){

                        osCount.android += 1;

                    // other linux? :-)
                    }else{

                        osCount.otherLinux += 1;

                    }
 
                // other os, no idea? :-(
                }else{

                    osCount.otherOS += 1;

                }
*/

                a++;
            }

            i++;
        }

        console.log(osCount);

    });

};



// start server
app.listen(openShift.port, openShift.ipaddress);

// run update loop
update();
