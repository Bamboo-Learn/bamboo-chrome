
// -------------------------------------------------------------------------- Chrome Storage

// TODO: chrome storage here should allow user to change confidence locally after
// sending a request to the db because we risk increasing too much

const LOAD_INTERVAL = 30 * 60 * 1000; // 30 minutes

class ChromeStorage {
	constructor(app) {
    this.app = app;
    this.phrases = [];
	}

	validateChromePhrases({ timestamp, chromePhrases }) {
		return !!timestamp && !!chromePhrases && chromePhrases.length >= 0;
	}

	needsUpdate({ timestamp }) {
		return ((new Date().getTime()) - timestamp) > LOAD_INTERVAL;
	}

	store(phrases, isLoad) {
    this.phrases = phrases;
		chrome.storage.sync.set({ 'phrases': JSON.stringify(phrases) }, () => {
      if(isLoad) {
        chrome.storage.sync.set({ 'timestamp': new Date().getTime() }, () => { });
      }
		});
	}

	changeConfidence({ _id, newConfidence }) {
		this.phrases.forEach(p => {
      if(p._id === _id) {
        p.confidence = newConfidence;
      }
    });
    this.store(this.phrases, false);
	}

	load() {
		return chrome.storage.sync.get(['timestamp', 'phrases'], ({ timestamp, phrases }) => {

			// load the chrome data first
			let chromePhrases = [];
			let validChromeLoad = true;
			try {
				// load the data here, if fail or invalid after load set validChromeLoad to false
				chromePhrases = JSON.parse(phrases);
				validChromeLoad = this.validateChromePhrases({ timestamp, chromePhrases });
			} catch {
				validChromeLoad = false;
			}
      this.phrases = chromePhrases;
			this.app.loadCallback({ validChromeLoad, timestamp, chromePhrases });
		});
	}
}

// -------------------------------------------------------------------------- Display

class Display {
	constructor(app) {
		this.app = app;
		$('#login-button').click(() => {
			this.app.loginWithEmailAndPassword().then(() => {
				this.app.load();
			});
		});

		$('#forgot-password-button').click(() => {
			window.location = 'https://app.bamboolearn.com';
		});


		$('#create-account-button').click(() => {
			window.location = 'https://app.bamboolearn.com';
    });
    
    $('#logout').click(() => {
      this.app.logout();
    })
	}

	showLoginOverlay() {
		$('.login-overlay').addClass('open');
  }

  hideLoginOverlay() {
		$('.login-overlay').removeClass('open');
  }
  
  hideLogoutOption() {
    $('#logout').hide();
  }

	getEmailValue() {
		return $('#email').val()
	}

	confidenceBackground(confidence) {
		const fill = '0008';
		const back = '0006';
		const percent = 100 * confidence / 10;
		return {
			background: `
        linear-gradient(
          90deg, 
          #${fill} 0%, 
          #${fill} ${percent}%,
          #${back} ${percent}%,
          #${back} 100%
        )`
		};
	}

	hideConfidenceButtons() {
		$('.button').hide();
		$('.col.center').css({
			width: '100%'
		});
	}

	getPasswordValue() {
		return $('#password').val()
	}

	setPhrase({ _id, confidence, characters, pinyin, english }) {
		$('#character').click(() => {
			window.location = `https://translate.google.com/#view=home&op=translate&sl=zh-CN&tl=en&text=${characters}`;
		});
		$('#character').text(characters);
		$('#pinyin').text(pinyin);
		$('#english').text(english);
		$('#plus').click(() => {
			this.app.changeConfidence({ _id, confidence, dir: 1 });
		});
		$('#minus').click(() => {
			this.app.changeConfidence({ _id, confidence, dir: -1 });
		});
		this.setConfidenceBackground(confidence);
	}

	setConfidenceBackground(confidence) {
		$('#confidence').css(this.confidenceBackground(confidence));
	}

	blank() {
		$('.container').hide();
	}

}

// -------------------------------------------------------------------------- App

class App {
	constructor() {
		this.display = new Display(this);
		this.mongodb = new Mongodb();
		this.storage = new ChromeStorage(this);
		this.hasConfidenceBeenChanged = false;
	}

	init() {
		if (this.mongodb.isLoggedIn()) {
			// if logged in then load
      this.load();
		} else {
			// otherwise show the overlay
			this.display.showLoginOverlay();
      this.display.hideLogoutOption();
		}
	}

	async loginWithEmailAndPassword() {
		await this.mongodb.loginWithEmailAndPassword({
			email: this.display.getEmailValue(),
			password: this.display.getPasswordValue()
    });
    this.display.hideLoginOverlay();
    this.load();
  }
  
  logout() {
    this.mongodb.logout();
  }

	load() {
		this.storage.load();
	}

	async loadCallback({ chromePhrases, timestamp, validChromeLoad }) {
		if (validChromeLoad) {
			// if there is data in chrome avaialbe then use that
			this.pickPhrase(chromePhrases);
		}
		if (!validChromeLoad || this.storage.needsUpdate({ timestamp })) {
			// if the chrome data does not exist or was not loaded in the time window
			try {
				// load the mongodb data
				const mongodbPhrases = await this.mongodb.getPhrases();
				if (!!mongodbPhrases || mongodbPhrases.length > 0) {
					// if there are phrases to study available then store them
          this.storage.store(mongodbPhrases, true);
          if(!validChromeLoad){
            this.pickPhrase(mongodbPhrases);
          }
				} else {
					// TODO: if they don't have any words then prompt them to add some
					// 'Nothing to study now, want to <a>add new phrases</a>?'
				}
			} catch {
				// means network is probably disabled
				this.display.blank();
			}
		}
	}

	pickPhrase(phrases) {
		// if (!networkEnabled) {
		//   $('#button-holder').hide();
		// }
		const phrase = phrases[Math.floor(Math.random() * phrases.length)];
		this.display.setPhrase(phrase);
  }
  
  changeConfidence({ _id, confidence, dir }) {
		this.display.hideConfidenceButtons();

		if (this.hasConfidenceBeenChanged) {
			// if the confidence has already been changed then don't change it
			return;
		}
		this.hasConfidenceBeenChanged = true;

		// calculate new confidence = [0, 10], delta = +/- [.5, 1)
		const dConfidence = dir * (Math.random() * .5 + .5);
		let newConfidence = (!confidence) ? dConfidence : confidence + dConfidence;
		switch (true) {
			case newConfidence < 0:
				newConfidence = 0;
				break;
			case newConfidence > 10:
				newConfidence = 10;
				break;
		}

		this.display.setConfidenceBackground(newConfidence);
		this.mongodb.changeConfidence({ _id, newConfidence });
		this.storage.changeConfidence({ _id, newConfidence })
	}
}


// -------------------------------------------------------------------------- Main

(function () {
	const app = new App();
	app.init();
})();
