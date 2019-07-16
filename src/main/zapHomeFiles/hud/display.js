// app is the main Vue object controlling everything
var app;
var tabId = '';
var frameId = '';
var context = {
	url: document.referrer,
	domain: utils.parseDomainFromUrl(document.referrer)
};

// Event dispatcher for Vue
var eventBus = new Vue();

/* Vue Components */
Vue.component('modal', {
	template: '#modal-template',
	props: ['show', 'title', 'text', 'size'],
	computed: {
		isWide: function() {
			return this.size === 'wide';
		},
		isSmall: function() {
			return this.size === 'small';
		}
	},
	methods: {
		close: function () {
			this.$emit('close');
		},
		afterLeave: function (el) {
			if (!app.keepShowing) {
				app.backStack = [];
				hideDisplayFrame();
			}
			app.keepShowing = false;
		}
	}
})

Vue.component('nav-modal', {
	template: '#nav-modal-template',
	props: ['show', 'title', 'text', 'stack'],
	computed: {
		isBackShowing() {
			return this.stack && this.stack.length > 1
		}
	},
	methods: {
		close: function () {
			this.$emit('close');
		},
		back() {
			this.$emit('back');
			
			app.keepShowing = true;
			app.backStack.pop();

			let showPrevious = app.backStack[app.backStack.length - 1]
			showPrevious()
		},
	}
})

Vue.component('dialog-modal', {
	template: '#dialog-modal-template',
	props: ['show', 'title', 'text'],
	methods: {
		close: function() {
			this.$emit('close');
		},
		buttonClick: function(id) {
			this.port.postMessage({'action': 'dialogSelected', id: id});
			this.close();
		}
	},
	data() {
		return {
			port: null,
			buttons: [
				{text: I18n.t("common_ok"), id:"okay"},
				{text: I18n.t("common_cancel"), id:"cancel"}
			]
		}
	},
	created: function() {
		let self = this;

		eventBus.$on('showDialogModal', data => {

			app.isDialogModalShown = true;
			app.dialogModalTitle = data.title;
			app.dialogModalText = data.text;

			self.buttons = data.buttons;
			self.port = data.port;
		})
	},
	beforeDestroy () {
		eventBus.$off('showDialogModal')
	}
});


Vue.component('ajax-dialog-modal', {
	template: '#ajax-dialog-modal-template',
	props: ['show', 'title', 'text'],
	methods: {
		close: function() {
			this.$emit('close');
		},
		buttonClick: function(id) {
			this.port.postMessage({'action': 'dialogSelected', id: id, 'browserId': this.browser});
			this.close();
		}
	},
	data() {
		return {
			port: null,
			browser: 'firefox-headless',
			status: '',
			buttons: [
				{text: I18n.t("common_ok"), id:"okay"},
				{text: I18n.t("common_cancel"), id:"cancel"}
			]
		}
	},
	created: function() {
		let self = this;

		eventBus.$on('showAjaxDialogModal', data => {
			app.isAjaxDialogModalShown = true;
			app.dialogModalTitle = data.title;
			app.dialogModalText = data.text;

			self.buttons = data.buttons;
			self.port = data.port;
			self.status = data.status;
		})
	},
	beforeDestroy () {
		eventBus.$off('showAjaxDialogModal')
	}
});

Vue.component('select-tool-modal', {
	template: '#select-tool-modal-template',
	props:['show', 'title'],
	methods: {
		close: function() {
			this.$emit('close');
		},
	},
	data() {
		return {
			port: null,
			tools: []
		}
	},
	created: function() {
		let self = this;

		eventBus.$on('showSelectToolModal', data => {
			app.isSelectToolModalShown = true;

			self.tools = data.tools;
			self.port = data.port;
		});
	},
	beforeDestroy () {
		eventBus.$off('showSelectToolModal')
	}
})

Vue.component('tool-li', {
	template: '#tool-li-template',
	props:['image', 'label', 'toolname', 'port'],
	methods: {
		close: function() {
			this.$emit('close');
		},
		toolSelect: function() {
			this.port.postMessage({'action': 'toolSelected', 'toolname': this.toolname})
			this.close();
		}
	}
})

Vue.component('all-alerts-modal', {
	template: '#all-alerts-modal-template',
	props: ['show', 'title'],
	methods: {
		close: function () {
			this.$emit('close');
		}
	},
	data() {
		return {
			port: null,
			alerts: {},
			activeTab: I18n.t("alerts_risk_high")
		}
	},
	created: function() {
		let self = this;

		eventBus.$on('showAllAlertsModal', data => {
			app.isAllAlertsModalShown = true;
			app.allAlertsModalTitle = data.title;

			self.alerts = data.alerts;
			self.port = data.port;
			self.activeTab = data.risk;
		})
	},
	beforeDestroy () {
		eventBus.$off('showAllAlertsModal')
	}
})

Vue.component('alert-list-modal', {
	template: '#alert-list-modal-template',
	props:['show', 'title'],
	methods: {
		close: function() {
			this.$emit('close');
		},
	},
	data() {
		return {
			port: null,
			alerts: {}
		}
	},
	created() {
		let self = this;

		eventBus.$on('showAlertListModal', data => {
			app.isAlertListModalShown = true;
			app.alertListModalTitle = data.title;

			self.alerts = data.alerts;
			self.port = data.port;
		});
	},
	beforeDestroy () {
		eventBus.$off('showAlertListModal')
	}
})

Vue.component('alert-accordion', {
	template: '#alert-accordion-template',
	props:['title', 'alerts', 'port'],
	methods: {
		close: function() {
			this.$emit('close');
		},
		urlCount: function(alert) {
			return alert.length;
		},
		alertSelect: function(alert) {
			// set keepShowing so that we don't hide the display frame
			app.keepShowing = true;
			app.isAlertListModalShown = false;
			app.isAllAlertsModalShown = false;

			navigator.serviceWorker.controller.postMessage({tabId: tabId, frameId: frameId, action: "commonAlerts.showAlert", alertId:alert.id});
		}
	}
})

Vue.component('alert-details-modal', {
	template: '#alert-details-modal-template',
	props: ['show', 'title', 'stack'],
	methods: {
		close: function() {
			this.$emit('close');
		},
		messageSelected: function(id) {
			app.keepShowing = true;
			app.isAlertDetailsModalShown = false;
			navigator.serviceWorker.controller.postMessage({tabId: tabId, frameId: frameId, action: "showHttpMessageDetails", tool: "history", id:id});
		},
		back: function() {
			app.isAlertDetailsModalShown = false;
		}
	},
	data() {
		return {
			port: null,
			details: {},
		}
	},
	created() {
		let self = this;

		eventBus.$on('showAlertDetailsModal', data => {
			app.isAlertDetailsModalShown = true;
			app.alertDetailsModalTitle = data.title;

			self.details = data.details;
			self.port = data.port;
		})
	},
	beforeDestroy () {
		eventBus.$off('showAlertDetailsModal')
	}
})

Vue.component('simple-menu-modal', {
	template: '#simple-menu-modal-template',
	props: ['show', 'title'],
	methods: {
		close: function() {
			this.$emit('close');
		},
		itemSelect: function(itemId) {
			this.port.postMessage({'action': 'itemSelected', 'id': itemId});
			this.close();
		}
	},
	data() {
		return {
			port: null,
			items: {}
		}
	},
	created() {
		let self = this;

		eventBus.$on('showSimpleMenuModal', data => {
			app.isSimpleMenuModalShown = true;
			app.simpleMenuModalTitle = data.title;

			self.items = data.items;
			self.port = data.port;
		})
	},
	beforeDestroy () {
		eventBus.$off('showSimpleMenuModal')
	}
})

Vue.component('adv-menu-modal', {
	template: '#adv-menu-modal-template',
	props: ['show', 'title'],
	methods: {
		close: function() {
			this.$emit('close');
		},
		itemSelect: function(itemId) {
			this.port.postMessage({'action': 'itemSelected', 'id': itemId});
			this.close();
		}
	},
	data() {
		return {
			port: null,
			items: {}
		}
	},
	created() {
		let self = this;

		eventBus.$on('showAdvMenuModal', data => {
			app.isAdvMenuModalShown = true;
			app.iconMenuModalTitle = data.title;

			self.items = data.items;
			self.port = data.port;
		})
	},
	beforeDestroy () {
		eventBus.$off('showAdvMenuModal')
	}
})

Vue.component('http-message-modal', {
	template: '#http-message-modal-template',
	props: ['show', 'title', 'request', 'response', 'is-response-disabled', 'active-tab', 'stack'],
	methods: {
		close: function() {
			this.$emit('close');
		},
		back: function() {
			app.isHistoryMessageModalShown = false;
		}
	},
	computed:{
		currentMessage() {
			let method = '';
			let header = '';
			let body = '';

			if (!this.response.isReadonly) {
				header = this.response.header;
				body = this.response.body;
			}
			else {
				method = this.request.method;
				header = this.request.header;
				body = this.request.body;
			}

			return {'method': method, 'header': header, 'body': body};
		},

	}
})

Vue.component('break-message-modal', {
	template: '#break-message-modal-template',
	props: ['show', 'title'],
	methods: {
		close: function() {
			this.step();
			this.$emit('close');
		},
		step: function() {
			let message = this.$refs.messageModal.currentMessage;

			this.$emit('close');
			this.port.postMessage({buttonSelected: 'step', tabId: tabId, method: message.method, header: message.header, body: message.body});
		},
		continueOn: function() {
			let message = this.$refs.messageModal.currentMessage;

			this.port.postMessage({buttonSelected: 'continue', tabId: tabId, method: message.method, header: message.header, body: message.body});
			this.$emit('close');
		},
		drop: function() {
			this.port.postMessage({buttonSelected: 'drop', frameId: frameId});
			this.$emit('close');
		}
	},
	data() {
		return {
			port: null,
			request: {},
			response: {},
			isDropDisabled: false,
			isResponseDisabled: false,
			activeTab: I18n.t("common_request")
		}
	},
	created() {
		let self = this;

		eventBus.$on('showBreakMessageModal', data => {
			self.request = data.request;
			self.response = data.response;
			self.port = data.port;
			self.isResponseDisabled = data.isResponseDisabled;
			self.activeTab = data.activeTab;

			self.request.isReadonly = !data.isResponseDisabled;
			self.response.isReadonly = data.isResponseDisabled;

			// Only show the Drop option for things that dont look like a requests for a web page as this can break the HUD UI
			if (data.isResponseDisabled) {
				// Its a request
				let headerLc = data.request.header.toLowerCase();
				self.isDropDisabled = headerLc.match('accept:.*text\/html');
				// Explicitly XHRs should be fine
				if (headerLc.match('x-requested-with.*xmlhttprequest')) {
					self.isDropDisabled = false;
				}
			} else {
				// Its a response
				let headerLc = data.response.header.toLowerCase();
				self.isDropDisabled = headerLc.match('content-type:.*text\/html');
			}

			app.isBreakMessageModalShown = true;
			app.BreakMessageModalTitle = data.title;
		})

		eventBus.$on('closeAllModals', () => {
			this.$emit('close');
		})
	},
	beforeDestroy () {
		eventBus.$off('showBreakMessageModal')
		eventBus.$off('closeAllModals')
	}
})

Vue.component('history-message-modal', {
	template: '#history-message-modal-template',
	props: ['show', 'title', 'stack'],
	methods: {
		close: function() {
			this.$emit('close');
		},
		replay: function() {
			let message = this.request;

			this.port.postMessage({'buttonSelected': 'replay', 'method': message.method, 'header': message.header, 'body': message.body});
			this.$emit('close');
		},
		replayInBrowser: function() {
			let self = this;
			let message = this.request;
			let channel = new MessageChannel();
			channel.port1.onmessage = function(event) {
				if (event.data.requestUrl) {
					window.top.location.href = event.data.requestUrl;
				} else {
					self.errors = I18n.t("error_invalid_html_header");
				}
			};
			navigator.serviceWorker.controller.postMessage({
				action:"zapApiCall", component: "hud", type: "action",
				name: "recordRequest",
				params: { header: message.header, body: message.body }}, [channel.port2]);
		},
		ascanRequest: function() {
			let req = this.request;
			this.$emit('close');
			navigator.serviceWorker.controller.postMessage(
				{tabId: tabId, frameId: frameId, action: "ascanRequest", tool: "active-scan",
					uri: req.uri, method: req.method, body: req.body});
		}
	},
	data() {
		return {
			port: null,
			request: {},
			response: {},
			isAscanDisabled: true,
			isResponseDisabled: false,
			activeTab: 'Request',
			errors: ''
		}
	},
	created() {
		let self = this;

		eventBus.$on('showHistoryMessageModal', data => {
			self.request = data.request;
			self.response = data.response;
			self.port = data.port;
			self.isResponseDisabled = data.isResponseDisabled;
			self.isAscanDisabled = data.isAscanDisabled;
			self.activeTab = data.activeTab;

			self.request.isReadonly = false;
			self.response.isReadonly = true;

			app.isHistoryMessageModalShown = true;
			app.HistoryMessageModalTitle = data.title;
		})
	},
	beforeDestroy () {
		eventBus.$off('showHistoryMessageModal')
	}
})

Vue.component('ws-message-modal', {
	template: '#ws-message-modal-template',
	props: ['show', 'title', 'time', 'direction', 'opcode', 'payload'],
	methods: {
		close: function() {
			this.$emit('close');
		},
	},
	computed:{
		currentMessage() {
			let payload = this.payload;
			return {'payload': payload};
		}
	}
})

Vue.component('websocket-message-modal', {
	template: '#websocket-message-modal-template',
	props: ['show', 'title'],
	methods: {
		close: function() {
			this.$emit('close');
		},
		replay: function() {
			this.port.postMessage({buttonSelected: 'replay', channelId: this.channelId, outgoing: this.outgoing, message: this.$refs.messageModal.currentMessage.payload});
			this.$emit('close');
		}
	},
	data() {
		return {
			port: null,
			time: null,
			direction: null,
			outgoing: null,
			opcode: null,
			channelId: null,
			payload: null,
			isReplayDisabled: false,
		}
	},
	created() {
		let self = this;

		eventBus.$on('showWebSocketMessageModal', data => {
			let date = new Date(Number(data.msg.timestamp));
			self.time = date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + '.' + date.getMilliseconds();
			self.payload = data.msg.payload;
			self.channelId = data.msg.channelId;
			self.outgoing = data.msg.outgoing;
			// The outgoing field is actually a string not a boolean
			if (data.msg.outgoing === "true") {
				self.direction = I18n.t("websockets_direction_outgoing");
			} else {
				self.direction = I18n.t("websockets_direction_incoming");
			}
			self.opcode = data.msg.opcodeString;
			self.isReplayDisabled = data.msg.opcodeString != 'TEXT';
			self.port = data.port;

			app.isWebsocketMessageModalShown = true;
			app.websocketMessageModalTitle = data.title;
		})
	},
	beforeDestroy () {
		eventBus.$off('showWebSocketMessageModal')
	}
})


Vue.component('break-websocket-message-modal', {
	template: '#break-websocket-message-modal-template',
	props: ['show', 'title'],
	methods: {
		close: function() {
			this.step();
			this.$emit('close');
		},
		step: function() {
			let message = this.$refs.messageModal.currentMessage;
			this.$emit('close');
			this.port.postMessage({buttonSelected: 'step', tabId: tabId, payload: message.payload, outgoing: this.outgoing});
		},
		continueOn: function() {
			let message = this.$refs.messageModal.currentMessage;
			this.$emit('close');
			this.port.postMessage({buttonSelected: 'continue', tabId: tabId, payload: message.payload, outgoing: this.outgoing});
		},
		drop: function() {
			this.port.postMessage({buttonSelected: 'drop', frameId: frameId});
			this.$emit('close');
		}
	},
	data() {
		return {
			port: null,
			time: null,
			direction: null,
			outgoing: null,
			opcode: null,
			channelId: null,
			payload: null
		}
	},
	created() {
		let self = this;

		eventBus.$on('showBreakWebSocketMessageModal', data => {
			let date = new Date(Number(data.msg.timestamp));
			self.time = date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + '.' + date.getMilliseconds();
			self.payload = data.msg.payload;
			self.channelId = data.msg.channelId;
			self.outgoing = data.msg.outgoing;
			// The outgoing field is actually a string not a boolean
			if (data.msg.outgoing === "true") {
				self.direction = I18n.t("websockets_direction_outgoing");
			} else {
				self.direction = I18n.t("websockets_direction_incoming");
			}
			self.opcode = data.msg.opcodeString;
			self.port = data.port;

			app.isBreakWebSocketMessageModalShown = true;
			app.BreakWebSocketMessageModalTitle = data.title;
		})

		eventBus.$on('closeAllModals', () => {
			this.$emit('close');
		})
	}
})

Vue.component('site-tree-node', {
	template: '#site-tree-node-template',
	props: {
		model : Object },
	methods: {
	    toggle: function () {
	      if (! this.model.isLeaf) {
	        this.open = !this.open
	        if (this.open) {
	          this.showChildren();
	        } else {
	          // We always want to query ZAP when expanding a node
	          Vue.set(this.model, 'children', [])
	        }
	      }
	    },
	    showHttpMessageDetails: function () {
		    app.keepShowing = true;
		    app.isSiteTreeModalShown = false;
		    navigator.serviceWorker.controller.postMessage({tabId: tabId, frameId: frameId, action: "showHttpMessageDetails", tool: "history", id:this.model.hrefId});
	    },
	    showChildren: function () {
	      this.addChild(I18n.t("sites_children_loading"), false);
			var treeNode = this;
			let channel = new MessageChannel();

			channel.port1.onmessage = function(event) {
				// Remove the ..loading.. child
				Vue.set(treeNode.model, 'children', [])
				for(var i = 0; i < event.data.childNodes.length; i++) {
					var child = event.data.childNodes[i];
					treeNode.addChild(child.name, child.method, child.isLeaf, child.hrefId);
				}
			};
			navigator.serviceWorker.controller.postMessage({
				action:"zapApiCall", component: "core", type: "view",
				name: "childNodes", "params" : { url: this.model.url }}, [channel.port2]);
	    },
	    addChild: function (name, method, isLeaf, hrefId) {
	      if (name.slice(-1) == '/') {
	      	name = name.slice(0, -1);
	      }
	      if ((name.match(/\//g) || []).length > 2) {
	        // If there are more than 2 slashes just show last url element
	        // The first 2 slashes will be http(s)://...
	        name = name.substring(name.lastIndexOf('/') +1);
	      }
	      if (isLeaf) {
	        name = method + ": " + name;
	      }
	      this.model.children.push({
	        name: name,
	        isLeaf: isLeaf,
	        hrefId: hrefId,
	        method: method,
	        children: [],
	        url: this.model.url === '' ? name : this.model.url + '/' + name
	      })
		}
	},
	data() {
		return {
		  name: I18n.t("sites_tool"),
		  open: false,
		}
	}
})

Vue.component('site-tree-modal', {
	template: '#site-tree-modal-template',
	props: {
		title : '',
		show : ''},
	methods: {
		close: function() {
			this.$emit('close');
		}
	},
	data() {
		return {
		  port: null,
		  name: I18n.t("sites_tool"),
		  open: false,
		  model: {
		    name: I18n.t("sites_title"),
		    isLeaf: false,
		    hrefId: 0,
		    url: '',
		    method: '',
		    children: []
		  }
		}
	},
	created() {
		let self = this;

		eventBus.$on('showSiteTreeModal', data => {
			self.port = data.port;

			app.isSiteTreeModalShown = true;
			app.siteTreeModalTitle = data.title;
		})
	},
	beforeDestroy () {
		eventBus.$off('showSiteTreeModal')
	}
})

Vue.component('tabs', {
	template: '#tabs-template',
	props: ['activetab'],
    data() {
        return {
			tabs: []
		};
    },
    methods: {
        selectTab(selectedTab) {
            this.tabs.forEach(tab => {
                tab.isActive = (tab.href == selectedTab.href);
            });
		},
		changeTab(tabName) {
			let tabHref = '#' + tabName.toLowerCase().replace(/ /g, '-');

			this.tabs.forEach(tab => {
				tab.isActive = (tab.href == tabHref);
			})
		}
	},
	watch: {
		activetab: function (tabName) {
			this.changeTab(tabName)
		}
	},
    created() {
        this.tabs = this.$children;
    },

});

Vue.component('tab', {
    template: '#tab-template',
    props: {
        name: { required: true },
		selected: { default: false },
		disabled: { default: false }
    },
    data() {
        return {
			isActive: false,
			isDisabled: false
        };
    },
    computed: {
        href() {
	        return '#' + this.name.toLowerCase().replace(/ /g, '-');
        }
    },
    mounted() {
		this.isActive = this.selected;
		this.isDisabled = this.disabled;
    },
});

document.addEventListener("DOMContentLoaded", () => {
	let params = new URL(document.location).searchParams;

	frameId = params.get('frameId');
	tabId = params.get('tabId');

	/* Vue app */
	app = new Vue({
		i18n: I18n.i18n,
		el: '#app',
		data: {
			isDialogModalShown: false,
			isAjaxDialogModalShown: false,
			dialogModalTitle: "",
			dialogModalText: "text",
			isSelectToolModalShown: false,
			isAlertListModalShown: false,
			alertListModalTitle: I18n.t("alerts_title"),
			isAllAlertsModalShown: false,
			allAlertsModalTitle: I18n.t("alerts_all_title"),
			isAlertDetailsModalShown: false,
			alertDetailsModalTitle: I18n.t("alerts_details_title"),
			isSimpleMenuModalShown: false,
			simpleMenuModalTitle: I18n.t("common_menu_title"),
			isAdvMenuModalShown: false,
			advMenuModalTitle: I18n.t("common_menu_title"),
			isBreakMessageModalShown: false,
			breakMessageModalTitle: I18n.t("break_http_message_title"),
			isHistoryMessageModalShown: false,
			historyMessageModalTitle: I18n.t("history_http_message_title"),
			isWebsocketMessageModalShown: false,
			websocketMessageModalTitle: I18n.t("websockets_message_title"),
			isBreakWebSocketMessageModalShown: false,
			breakWebSocketMessageModalTitle: I18n.t("break_intercept_ws_title"),
			isSiteTreeModalShown: false,
			siteTreeModalTitle: I18n.t("sites_tool"),
			keepShowing: false,
			backStack: [],
		},
	});
});

navigator.serviceWorker.addEventListener("message", event => {
	var action = event.data.action;
	var config = event.data.config;
	var port = event.ports[0];
	let show;

	switch(action) {
		case "showDialog":
			show = () => eventBus.$emit('showDialogModal', {
				title: config.title,
				text: config.text,
				buttons: config.buttons,
				port: port
			});

			app.backStack.push(show)
			show()

			showDisplayFrame();
			break;

		case "showAjaxDialog":
			show = () => eventBus.$emit('showAjaxDialogModal', {
				title: config.title,
				text: config.text,
				buttons: config.buttons,
				status: config.status,
				port: port
			});

			app.backStack.push(show)
			show()

			showDisplayFrame();
			break;

		case "showAddToolList":
			show = () => eventBus.$emit('showSelectToolModal', {
				tools: config.tools,
				port: port
			});

			app.backStack.push(show)
			show()


			showDisplayFrame();
			break;

		case "showAlerts":
			show = () => eventBus.$emit('showAlertListModal', {
				title: config.title,
				alerts: config.alerts,
				port: port
			});

			app.backStack.push(show)
			show()

			showDisplayFrame();
			break;

		case "showAllAlerts":
			show = () => eventBus.$emit('showAllAlertsModal', {
				title: config.title,
				alerts: config.alerts,
				port: port,
				risk: config.risk
			});

			app.backStack.push(show)
			show()

			showDisplayFrame();
			break;

		case "showAlertDetails":
			show = () => eventBus.$emit('showAlertDetailsModal', {
				title: config.title,
				details: config.details,
				port: port
			});

			app.backStack.push(show)
			show()

			showDisplayFrame();
			break;

		case "showButtonOptions":
			show = () => eventBus.$emit('showSimpleMenuModal', {
				title: config.toolLabel,
				items: config.options,
				port: port
			});

			app.backStack.push(show)
			show()

			showDisplayFrame();
			break;

		case "showHudSettings":
			show = () => eventBus.$emit('showAdvMenuModal', {
				title: I18n.t("settings_title"),
				items: config.settings,
				port: port
			});

			app.backStack.push(show)
			show()

			showDisplayFrame();
			break;

		case "showBreakMessage":
			show = () => eventBus.$emit('showBreakMessageModal', {
				title: I18n.t("break_intercept_http_title"),
				request: config.request,
				response: config.response,
				isResponseDisabled: config.isResponseDisabled,
				activeTab: config.activeTab,
				port: port
			});

			app.backStack.push(show)
			show()

			showDisplayFrame();
			break;

		case "showHistoryMessage":
			show = () => eventBus.$emit('showHistoryMessageModal', {
				title: I18n.t("history_http_message_title"),
				request: config.request,
				response: config.response,
				isResponseDisabled: config.isResponseDisabled,
				isAscanDisabled: config.isAscanDisabled,
				activeTab: config.activeTab,
				port: port
			});

			app.backStack.push(show)
			show()

			showDisplayFrame();
			break;

		case "showWebSocketMessage":
			show = () => eventBus.$emit('showWebSocketMessageModal', {
				title: I18n.t("websockets_message_title"),
				msg: config,
				port: port
			});

			app.backStack.push(show)
			show()

			showDisplayFrame();
			break;

		case "showBreakWebSocketMessage":
			show = () => eventBus.$emit('showBreakWebSocketMessageModal', {
				title: I18n.t("break_intercept_ws_title"),
				msg: config,
				port: port
			});

			app.backStack.push(show)
			show()

			showDisplayFrame();
			break;

		case "showSiteTree":
			show = () => eventBus.$emit('showSiteTreeModal', {
				title: I18n.t("sites_tool"),
				port: port
			});

			app.backStack.push(show)
			show()

			showDisplayFrame();
			break;

		case "showHtmlReport":
			let channel = new MessageChannel();

			channel.port1.onmessage = function(event) {
				// Open window and inject the HTML report
				window.open('').document.body.innerHTML = event.data.response;
			};
			navigator.serviceWorker.controller.postMessage({
				action:"zapApiCall", component: "core", type: "other",
				name: "htmlreport"}, [channel.port2]);

			break;

		case "closeModals":
			if (config && config.notTabId != tabId) {
				eventBus.$emit('closeAllModals', {
					port: port
				});
			}
			break;

		default:
			break;
	}
});

/* the injected script makes the main frame visible */
function showDisplayFrame() {
	return utils.messageWindow(parent, {action: "showMainDisplay"}, document.referrer);
}

/* the injected script makes the main frame invisible */
function hideDisplayFrame() {
	parent.postMessage({action:"hideMainDisplay"}, document.referrer);
}
