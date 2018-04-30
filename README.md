github-reporter
================

It's a convenient tool to help you list your commits and issues.


## API

### listReport(own, repo, branch, author, since, until)

List your commits and issues. For example:


```js
var githubReporter = require('github-reporter');
var promise = githubReporter.listReport('own', 'your repo', 'your branch', 'author', '2018-03-01T00:00:00', '2018-03-31T23:59:00');
promise.then((result)=>{
  console.log(result);
});
```

### setAccessToken(accessToken)

Set your access token.

```js
var githubReporter = require('github-reporter');
github.setAccessToken('your token');
```

