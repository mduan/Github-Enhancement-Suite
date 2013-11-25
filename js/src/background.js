function isFileDiffUrl(url) {
  return (
    url.match(/https:\/\/github.com\/.*\/pull\/.*/) ||
    url.match(/https:\/\/github.com\/.*\/commit\/.*/) ||
    url.match(/https:\/\/github.com\/.*\/compare\/.*/)
  );
}

var prevUrlByTab = {};
chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) {
  var tabId = details.tabId;
  var prevUrl = prevUrlByTab[tabId];
  var currUrl = details.url;
  if (isFileDiffUrl(currUrl) || prevUrl && isFileDiffUrl(prevUrl)) {
    // TODO(mack): Get changing page working w/o needing to reload tab.
    // Currently the problem is that going back/forward in history causes the
    // page to change before we can remove the react components for the old
    // page. This causes react to complain when trying to mount components
    // for the new page.
    chrome.tabs.reload(details.tabId);
  }
  prevUrlByTab[tabId] = currUrl;
});
