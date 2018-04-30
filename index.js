
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

function getIssueNumber(mesage) {
    var result = /#([0-9]+)/.exec(mesage);
    return result ? result[1] : null;
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

        var promises = messages
        .map(function(message){
            return getIssueNumber(message);
        })
        .filter(function(number) {
            return number != null;
        })
        .filter(onlyUnique)
        .map(function(number){
            return getIssue(own, repo, number)
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
                    title:issue.title
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

