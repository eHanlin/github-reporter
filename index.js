
var request = require('request');
var querystring = require('querystring');
var ACCESS_TOKEN = '';
var HOST = 'https://api.github.com/'
var headers = {'User-Agent':'githubReporter'};

function buildHttpPromise(options) {
    return new Promise(function(resolve, reject) {
        request(options, function(error, response, body){
            if (error) reject(body);
            resolve(JSON.parse(body));
        });
    });
}

function getIssue(org, repo, number) {
    var url = HOST + 'repos/' + org + '/' + repo +  '/issues/' + number + '?access_token=' + ACCESS_TOKEN;
    var options = {
        url:url,
        headers:headers
    };
    return buildHttpPromise(options);
}

function getIssueNumbers(message) {
    var result = [];
    var numbers = message.match(/#([0-9]+)/g) || [];
    var rGithubURL = /https:\/\/github.com\/([^/]+)\/([^/]+)\/issues\/([0-9]+)/g
    var githubCommits = (message.match(rGithubURL) || [])
    .map(function(url){
      var result = rGithubURL.exec(url);
      return result && result.length > 3 ?  {own:result[1], repo:result[2],number:result[3]} : null;
    });

    result = result.concat(numbers.map(function(number){ return {number:number.replace('#','')};}));

    if (githubCommits) {
        result = result.concat(githubCommits);
    }
    return result;
}

function listCommits(own, repo, branch, author, since, until, page) {
    var page = page ? Number(page) : 0;
    var queryString = querystring.stringify({access_token:ACCESS_TOKEN, sha:branch, author:author, since:since, until:until, page:page});
    var url = HOST + 'repos/' + own + '/' + repo +  '/commits?' + queryString;
    var options = {
        url:url,
        headers:headers
    };
    return buildHttpPromise(options).then(function(result){
        return result.length == 30 ? listCommits(own, repo, branch, author, since, until, page + 1).then(function(values){return values.concat(result)}) : result;
    });
}

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

function buildCommitPage(own, repo, branch, author, since, until){
    var queryString = querystring.stringify({author:author, since: since, until: until});
    return 'https://github.com/' + own + '/' + repo + '/commits/' + branch + '?' + queryString;
}

function listReport(own, repo, branch, author, since, until) {
    return listCommits(own, repo, branch, author, since, until)

    .then(function(commits) {
        var messages = commits.map(function(commit){return commit.commit.message;});
        var issueNumbers = [];

         messages
        .forEach(function(message){
            var numbers = getIssueNumbers(message);
            if (numbers != null) {
                issueNumbers = issueNumbers.concat(numbers);
            }
        });
        
        var promises = issueNumbers.map(function(issueNumber){
            return JSON.stringify(issueNumber);
        }).filter(onlyUnique)
        .map(function(issueNumber){
            return JSON.parse(issueNumber);
        })
        .map(function(issueNumber){
            return getIssue(issueNumber.own ? issueNumber.own : own, issueNumber.repo ? issueNumber.repo : repo, issueNumber.number)
        });
        return Promise.all(promises).then(function(issues){
            var result = {
                commitPage:buildCommitPage(own, repo, branch, author, since, until),
                commitCount:commits.length,
                commitMessages: commits.map(function(commit){ return commit.commit.message; })
            };
            result.issues = issues.filter(function(issue) {
                return issue.title != null;
            }).map(function(issue) {
                return {
                    title:issue.title,
                    homeUrl:issue.html_url
                }
            });
            return result;
        });
    });
}

exports.listReport = listReport;
exports.setAccessToken = function(accessToken) {
    ACCESS_TOKEN = accessToken;
};

