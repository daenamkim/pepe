import React, { Component } from 'react';
import randomstring from 'randomstring';
import Peer from 'peerjs';
import logo from './img/logo.png';
import './App.css';
import { Button, TextField, List, ListItem, ListItemText, ListItemIcon, Chip } from '@material-ui/core';
import { Drafts, Face } from '@material-ui/icons';
import copy from 'clipboard-copy';


const TYPE_FILE = 'file';
const TYPE_TEXT = 'text';

class App extends Component {
  constructor(props) {
		super(props);
		// TODO: when peer is not in the state, render didn't work well.
    this.state = {
      peer: new Peer({key: this.props.opts.peerjsKey}), //for testing
			/*
			//for production:
			peer = new Peer({
			  host: 'yourwebsite.com', port: 3000, path: '/peerjs',
			  debug: 3,
			  config: {'iceServers': [
			    { url: 'stun:stun1.l.google.com:19302' },
			    { url: 'turn:numb.viagenie.ca', credential: 'muazkh', username: 'webrtc@live.com' }
			  ]}
			})
			*/
			myId: '',
			peerId: '',
			initialized: false,
			files: [],
			textReceived: '',
			textSend: '',
			conn: null,
		};
  }

	componentWillMount() {
		this.state.peer.on('open', (id) => {
			console.log('My peer ID is: ' + id);
			this.setState({
				myId: id,
				initialized: true
			});
		});

		this.state.peer.on('connection', (connection) => {
			console.log('someone connected');
			console.log(connection);

			this.setState({
				conn: connection
			}, () => {
				this.state.conn.on('open', () => {
					this.setState({
						connected: true
					});
				});

				this.state.conn.on('data', this.onReceiveData);
			});
		});
	}

	componentWillUnmount() {
		this.state.peer.destroy();
	}

	connect = () => {
		var peerId = this.state.peerId;
		var connection = this.state.peer.connect(peerId);

		this.setState({
		    conn: connection
		}, () => {
			this.state.conn.on('open', () => {
				this.setState({
					connected: true
				});
			});
			this.state.conn.on('data', this.onReceiveData);
		});
	};

	sendFile = (event) => {
		console.log(event.target.files);
		if (!event.target.files) {
			return;
		}

		var file = event.target.files[0];
    var blob = new Blob(event.target.files, {type: file.type});

    this.state.conn.send({
				type: TYPE_FILE,
        file: blob,
        filename: file.name,
        filetype: file.type
    });
	};

	sendText = (event) => {
		const text = event.target.value;
		console.log(text);
		this.setState({
			textSend: text
		});
		this.state.conn.send({
			type: TYPE_TEXT,
			text
		});
	};

	onReceiveData = (data) => {
		console.log('Received', data);
		switch (data.type) {
			case TYPE_FILE:
				const blob = new Blob([data.file], {type: data.filetype});
				const url = URL.createObjectURL(blob);
				this.addFile({
					'name': data.filename,
					'url': url
				});
				break;
			case TYPE_TEXT:
				this.setState({
					textReceived: data.text
				});
				break;
			default:
		}
  };

	addFile = (file) => {
		const fileName = file.name;
		const fileUrl = file.url;

		const files = this.state.files;
		const fileId = randomstring.generate(5);

		files.push({
			id: fileId,
			url: fileUrl,
			name: fileName
		});

		this.setState({
			files: files
		});
	};

	handleTextChange = (event) => {
		this.setState({
		  peerId: event.target.value
		});
	};

	render() {
		return (
			<div className="app app-container">
				{this.state.initialized ? this.renderInitialized() : this.renderNotInitialized()}
			</div>
		);
	}

	renderInitialized() {
		const myId = this.state.myId;

		return (
			<div>
				<div>
					<img src={logo} className="app-logo" alt="Logo"></img>
				</div>
				<div className="my-id">
					{/* TODO: how to get my id label */}
					<span>{this.props.opts.myIdLabel || 'Your PeerJS ID:'} </span>
					<Chip icon={<Face />}label={myId} onClick={() => {
						copy(myId);
					}} />
				</div>
				<hr />
				{this.state.connected ? this.renderConnected() : this.renderNotConnected()}
			</div>
		);
	}

	renderNotInitialized() {
		return (
			<div>Loading...</div>
		);
	}

	renderNotConnected() {
		return (
			<div>
				<div className="p-10">
					<TextField
						className="input-peer-id"
						onChange={this.handleTextChange}
						label={this.props.opts.peerIdLabel || 'Peer ID'}
						variant="outlined" fullWidth={true}
					/>
				</div>
				<div className="p-10">
					<Button
						onClick={this.connect}
						variant="contained"
						color="primary"
					>
						{this.props.opts.connectLabel || 'connect'}
					</Button>
				</div>
			</div>
		);
	}

	renderConnected() {
		return (
			<div>
				<div className="p-10">
					<TextField
						className="text-send"
						value={this.state.textSend}
						onChange={this.sendText}
						variant="outlined"
						label="Send Text"
						multiline={true}
						fullWidth={true}
					/>
				</div>
				<div className="p-10">
					<input type="file" name="file" id="file" onChange={this.sendFile} style={{display: "none"}} />
					<Button
						type="file"
						name="file"
						id="file"
						onClick={() => document.getElementById('file').click()}
						variant="fab"
						color="secondary"
					>
						+
					</Button>
				</div>
				<hr />
				<div className="p-10 section-title">
					<span>Text shared to you:</span>
				</div>
				<div className="p-10">
					<TextField
						className="input-peer-id"
						value={this.state.textReceived || 'No text received.'}
						label={'Received Text'}
						variant="outlined"
						fullWidth={true}
						multiline={true}
					/>
				</div>
				<div className="p-10 section-title">
					<span>
						{this.props.opts.fileListLabel || 'Files shared to you: '}
					</span>
				</div>
				<div className="p-10">
					{this.state.files.length ? this.renderFiles() : this.renderNoFiles()}
				</div>
			</div>
		);
	}

	renderFiles() {
		return(
			<List component="nav">
				{this.state.files.map(item => {
					return(
						<ListItem
							button
							key={item.id}
							component="a"
							href={item.url}
							download={item.name}
						>
							<ListItemIcon>
								<Drafts />
							</ListItemIcon>
							<ListItemText primary={item.name} />
						</ListItem>
					);
				})}
			</List>
		);
	}

  renderNoFiles() {
		return (
			<div>
				<span>
					{this.props.opts.noFilesLabel || 'No files shared to you yet.'}
				</span>
			</div>
		);
	}
}

export default App;
