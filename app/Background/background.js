
var moment = require('moment');
var bgModule = {
    pastDays : [],
    websiteList: [],
    topTenYesterday: [],
    blackList: ["newtab", "google.", "chrome://", "localhost", "chrome-extension://","about:blank"],
    globalUrl: "",
    prevTab: "",
    daysfrominstall: 0,
    inFocus: false,
    formatedDate: moment().format("DDMMYYYY"),
    total:{
      "totalVisits": 0
    },
    blackListInit: function(){
      chrome.storage.sync.set({'blackList': bgModule.blackList}, function() {});
      chrome.storage.sync.set({'pastDays': bgModule.pastDays}, function() {});
    },
    resetBlackList: function(){
      chrome.storage.sync.set({'blackList': []}, function() {
      });
    },
    resetWebsiteList: function(){
      chrome.storage.sync.set({'websiteList': []}, function() {
      });
    },
    updateTotalVisits: function(list){

      if(list.length>10){
        for(var i = 0; i < 10; i++){
          bgModule.total.totalVisits += list[i].websiteVisits;
        }
      }else{
        for(var f = 0; f < list.length; f++){
          bgModule.total.totalVisits += list[f].websiteVisits;
        }
      }
      //TODO add total time
    },
    resetAtMidnight: function(){
      var timeNow = moment();
      var endOfTheDay = moment().endOf('day');
      var nextReset = moment.duration(moment(endOfTheDay).diff(timeNow));

      setTimeout(function() {
        'use strict';
        bgModule.formatedDate = moment().format("DDMMYYYY");
        console.log(bgModule.formatedDate);
        console.log("day reset test activated");
        bgModule.daysfrominstall++;
        console.log("daysfrominstall "+bgModule.daysfrominstall);

        //sort list by visits
        //maybe saparate method
        bgModule.websiteList = bgModule.websiteList.sort(function(a,b){
          return b.websiteVisits - a.websiteVisits;
        });

        //save past day
        //maybe saparate method
        //TODO this doubles the value if popup is open as same time
        bgModule.updateTotalVisits(bgModule.websiteList);
        var pastDay = {
              "name": bgModule.formatedDate,
              "totalVisits": bgModule.total.totalVisits,
              "websiteList": bgModule.websiteList.slice(0, 10)
          };
        bgModule.pastDays.unshift(pastDay);
        //save pastdays
        chrome.storage.sync.set({'pastDays': bgModule.pastDays}, function() {});
        //loop ony 7 days (7 objects)
        //maybe saparate method
        if(bgModule.pastDays.length > 6){
           bgModule.pastDays.splice(-1,1);
           chrome.storage.sync.set({'pastDays': bgModule.pastDays}, function() {});
        }

        console.log(bgModule.pastDays);

        //reset values
        //maybe saparate method
        bgModule.total.totalVisits = 0;
        bgModule.websiteList = [];
        //save changes to chrome strage
        bgModule.resetAtMidnight();


      }, nextReset);
    },
    extractDomain: function (url){
      if (url !== undefined) {
          //vars
          var domain;
          var regex = /(\..*){2,}/;

          //find & remove protocol (http, ftp, etc.) and get domain
          if (url.indexOf("://") > -1) {
              domain = url.split('/')[2];
          } else {
              domain = url.split('/')[0];
          }
          //find & remove port number
          domain = domain.split(':')[0];

          //removes everything before 1 dot - like: "www"
          if (regex.test(domain)) {
              domain = domain.substring(domain.indexOf(".") + 1);
          }
          var arr = domain.match(/[.]/gi);
          if(arr == null){
             return "";
          }
          var counter = arr.length;
          while(counter > 1){
              domain = domain.substr(domain.indexOf('.')+1);
              counter--;
          }
          return domain;
      }
      return "";
    },
    search: function (websiteName){
      for (var i = 0; i < bgModule.websiteList.length; i++) {
          if (bgModule.websiteList[i].websiteName === websiteName) {
              return bgModule.websiteList[i];
          }
      }
      return null;
    },
    blackListCheck: function (websiteName) {
      for (var b = 0; b < bgModule.blackList.length; b++) {
          if (websiteName.includes(bgModule.blackList[b])) {
              return true;
          }
      }
      return false;
    },
    saveData: function(){
      chrome.storage.sync.set({'websiteList': bgModule.websiteList}, function() {
      });
      chrome.storage.sync.set({'blackList': bgModule.blackList}, function() {
      });
    },
    saveTopYesterday : function () {
      chrome.storage.sync.set({'topTenYesterday': bgModule.topTenYesterday}, function() {
      });
    },
    updateDeactivationTime: function (tabURL) {
      var websiteName = bgModule.extractDomain(tabURL);
      var existingWebsite = bgModule.search(websiteName);
      if (existingWebsite) {
          var deactivationTime = moment().format();
          var duration = moment.duration(moment(deactivationTime).diff(existingWebsite.startTime));

          if (existingWebsite.timeDifference != null) {
              duration = duration.add(existingWebsite.timeDifference);
          }
          //format time
          var days = duration.days();
          var hours = duration.hours();
          var min = duration.minutes();
          var sec = duration.seconds();
          var formatedTime = {
              "days": days,
              "hours": hours,
              "min": min,
              "sec": sec
          };
          //update values
          existingWebsite.deactivationTime = deactivationTime;
          existingWebsite.timeDifference = duration;
          existingWebsite.formatedTime = formatedTime;
      }
      bgModule.saveData();
    },
    tabUpdatedAndActive: function (newUrl, favIcon) {
      //blacklist check
      if (bgModule.blackListCheck(newUrl) == false) {
          var websiteName = bgModule.extractDomain(newUrl);
          var existingWebsite = bgModule.search(websiteName);
          var start = moment().format();
          //favicon check
          if (favIcon === undefined) {
              favIcon = "/assets/images/default_icon.png";
          }
          if (!existingWebsite) {
              //max 30 website cap for faster loading
              if(bgModule.websiteList.length >=30){
                return;
              }
              //add new website to the list
              var website = {
                  websiteName: websiteName,
                  favIcon: favIcon,
                  websiteVisits: 1,
                  startTime: start,
                  deactivationTime: "",
              };
              bgModule.websiteList.push(website);
          } else {
              if (existingWebsite.favIcon == "/assets/images/default_icon.png") {
                  existingWebsite.favIcon = favIcon;
              }
              //add tab start time
              existingWebsite.startTime = start;
              //add visits
              existingWebsite.websiteVisits++;
          }
          bgModule.saveData();
      } else {
          //log if blocked
          console.log("blocked website: " + newUrl);
      }
    }
};
module.exports = bgModule;
