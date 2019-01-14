// @flow
import React, { Component } from 'react';
import * as gh from './git';
import './App.css';


class App extends Component<*> {

  async componentDidMount() {
    this.kitchenSink();
  }

  kitchenSink = async () => {
    let doIt = false;

    // get files
    const repo = 'loldoc';
    const ghFiles = await gh.getAdocFiles(repo);
    const taskFiles = ghFiles.map(f => ({ ...f, edited: false }));

    // edit stuff
    taskFiles[2].content = `== Ch 1\n\nYou Foobar.\n\n${Date.now()}`;
    taskFiles[2].edited = true;

    if (!doIt) {
      return;
    }

    // submit task
    const { branch } = await gh.createBranch(repo, 'master');
    const latestCommitSha = await gh.getHeadSha(repo, branch);
    const baseTreeSha = await gh.getTreeSha(repo, branch);

    const { data: { sha: newTreeSha } } = await gh.req('POST /repos/:owner/:repo/git/trees', {
      repo,
      base_tree: baseTreeSha,
      tree: taskFiles.filter(f => f.edited === true).map(f => ({
        path: f.path,
        mode: '100644',
        type: 'blob',
        content: f.content,
      })),
    });

    // make a new commit pointing at the new tree we just created
    const { data: { sha: newCommitSha }} = await gh.req('POST /repos/:owner/:repo/git/commits', {
      repo,
      message: `My commit msg at ${Date.now()}`,
      tree: newTreeSha,
      parents: [latestCommitSha],
    });

    // move the head up to point at the new commit
    const res = await gh.req('PATCH /repos/:owner/:repo/git/refs/heads/:branch', {
      repo,
      branch,
      sha: newCommitSha,
      // force: true, // ???
    });

    // now open the PR!
    const { data: { number: prNumber } } = await gh.req('POST /repos/:owner/:repo/pulls', {
      repo,
      title: 'My rad PR',
      head: branch,
      base: 'master',
      body: 'yo, you should merge this rad PR',
      maintainer_can_modify: true,
    });
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <p>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          <span
            className="App-link"
          >
            Learn React
          </span>
        </header>
      </div>
    );
  }
}

export default App;
