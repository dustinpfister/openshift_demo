var mongoose = require('mongoose'),

    openShift = require('./openshift.js').openShiftObj,

    db = mongoose.createConnection(openShift.mongo),
    Schema = mongoose.Schema,
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

    // the osCount object
    osCount = {

        // patterns to look for in user agent strings
        pats: [

            {
                osName: 'Android',
                pat: /android/,
                color: 'orange'
            }, {
                osName: 'Linux',
                pat: /linux/,
                color: 'yellow'
            }, {
                osName: 'Windows',
                pat: /windows/,
                color: 'green'
            },

            {
                osName: 'total',
                color: 'black'
            }, {
                osName: 'Other',
                color: 'grey'
            }

        ],

        // the count
        count: {},
        ipCount: 0,

        // count reset
        reset: function() {

            this.count = {};
            this.ipCount = 0;
            this.count.total = {
                count: 0,
                color: 'black'
            }

        },

        // count a user agent string
        countUA: function(UA) {

            var i = 0,
                len = this.pats.length,
                osName;

            this.count.total.count += 1;

            while (i < len) {

                if (UA.toLowerCase().match(this.pats[i].pat)) {

                    osName = this.pats[i].osName;
                    if (this.count[osName] === undefined) {
                        this.count[osName] = {
                            count: 1,
                            color: this.pats[i].color
                        }
                    } else {
                        this.count[osName].count += 1;
                    }

                    break;

                }

                i++;

            }

            if (i === len) {
                if (this.count['Other'] === undefined) {
                    this.count['Other'] = {
                        count: 1,
                        color: 'red'
                    }
                } else {

                    this.count['Other'].count += 1;

                }
            }

        },

        // the update loop
        update: function() {

            var i, a, aLen, agents, self = this;

            //  update every once in a while
            setTimeout(osCount.update.bind(osCount), 5000);

            // update stuff
            iplogger.find(function(err, logs) {

                self.reset();

                // set the new ipCount
                self.ipCount = logs.length;

                // find new OS count
                i = 0;
                while (i < self.ipCount) {

                    agents = logs[i].userAgents;
                    a = 0;
                    aLen = agents.length;

                    while (a < aLen) {

                        self.countUA(agents[a].userAgentString);

                        a++;
                    }

                    i++;
                }

                console.log('ipCount: ' + self.ipCount);
                console.log(self.count);

            });



        }

    };



exports.startUpdate = function() {

    //   setTimeout(exports.update, 1000);
    osCount.update();

};

exports.makeHTML = function() {

    var html = '<ul>';

    for (var os in osCount.count) {
        html += '<li style="color:' + osCount.count[os].color + ';">' + os + ' : ' + osCount.count[os].count + '</li>';
    }


    html += '</ul><div style="width:400px;height:30px;background:#888888;">';

    for (osName in osCount.count) {
        if (osName !== 'total') {
            html += '<div style="display:inline-block; width:' + Math.floor(osCount.count[osName].count / osCount.count['total'].count * 400) + 'px; height:30px; background:' + osCount.count[osName].color + ';"></div>';
        }
    }

    return html + '</div>';;

};

exports.getIPCount = function(){

    return osCount.ipCount;

};