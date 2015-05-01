var utils = require('./utils');
var https = require('https');
var querystring = require('querystring');
var cheerio = require('cheerio');
var Q = require('q');

module.exports.download = function(number, cookiesContainer) {
  var defer = Q.defer();

  var req = https.request({
    method: 'GET',
    host: 'www.autolib.eu',
    path: '/account/bills/' + number + '/',
    headers: {
      'Cookie': utils.stringifyCookies(cookiesContainer),
      'Accept-Language': 'en-US,en'
    }
  }, function(res) {
    utils.respBody(res).then(function(body) {
      defer.resolve(body);
    }).catch(function(err) {
      defer.reject('Body parsing failed.', err);
    })
  });

  req.on('error', function(err) {
    defer.reject('Request Error', err);
  });

  req.end();

  return defer.promise;
};

module.exports.filter = function(start, end, cookiesContainer) {

  var defer = Q.defer();

  if (start === undefined) {
    var now = new Date();
    start = now.getMonth() + '/01/' + now.getFullYear();
  }

  if (end === undefined) {
    var now = new Date();
    var d = new Date(now.getFullYear(), now.getMonth(), 0);
    end = now.getMonth() + '/' + d.getDate() + '/' + now.getFullYear();
  }

  var queryString = querystring.stringify({
    start: start,
    end: end
  });

  var req = https.request({
    method: 'GET',
    host: 'www.autolib.eu',
    path: '/account/bills/?' + queryString,
    headers: {
      'Cookie': utils.stringifyCookies(cookiesContainer),
      'Accept-Language': 'en-US,en'
    }
  }, function(res) {

    utils.respBody(res).then(function(body) {
      var html = body.toString();
      var $ = cheerio.load(html);

      var bills = $('.table-bills > tbody > tr').map(function(i, tr) {
        return {
          number: $(tr).find('td').eq(0).text().trim(),
          date: $(tr).find('td').eq(1).text().trim(),
          status: $(tr).find('td').eq(2).text().trim(),
          amount: Number($(tr).find('td').eq(3).text().replace(/[^0-9\.\,]/g, '').replace(',', '.'))
        };
      }).get();

      defer.resolve(bills);
    }).catch(function(err) {
      defer.reject('Body Parsing failed.', err);
    });
  });

  req.on('error', function(err) {
    defer.reject('Request Error', err);
  });

  req.end();

  return defer.promise;
};