
// -------------------------------------------------------------------------- Display

class Display {
	constructor(app) {
    this.app = app;
    $('#Overlay').hide();
    $('#Chinese').focus();

    // autofill on click
    $('#Autofill').click(() => {
      app.autofill();
    });

    // autofill on RETURN
    $('#Chinese').on('keypress', (e) => {
      if(e.which === 13) {
        app.autofill();
      }
    });

    // change the label when slider moves
    $('#Confidence').change(() => {
      const confidence = parseFloat($('#Confidence').val());
      switch (confidence) {
      case 0:
        $('#ConfidenceLabel').text('To Learn');
        break;
      case 10:
        $('#ConfidenceLabel').text('Learned');
        break;
      default:
        $('#ConfidenceLabel').text('Learning');
        break;
      }
    });

    // change the label and slider when label is clicked
    $('#ConfidenceLabel').click(() => {
      const confidenceLabel = $('#ConfidenceLabel').text();
      switch (confidenceLabel) {
      case 'To Learn':
        $('#Confidence').val('5');
        $('#ConfidenceLabel').text('Learning');
        break;
      case 'Learning':
        $('#Confidence').val('10');
        $('#ConfidenceLabel').text('Learned');
        break;
      case 'Learned':
        $('#Confidence').val('0');
        $('#ConfidenceLabel').text('To Learn');
        break;
      }
    });

    // save on click
    $('#Save').click(() => {
      app.save();
    });

    // autofill on RETURN
    $('#Save').on('keypress', (e) => {
      if(e.which === 13) {
        app.save();
      }
    });

    // cancel on click
    $('#Cancel').click(() => {
      window.close();
    });

    // open app in new tab on click
    $('#Logo').click(() => {
      window.open('https://app.bamboolearn.com', '_blank');
    });
  }

  setPhrase(phrase) {
    $('#Chinese').val(phrase.characters);
    $('#Pinyin').val(phrase.pinyin);
    $('#English').val(phrase.english);
  }

  getPhrase() {
    return new Phrase({
      characters: $('#Chinese').val(),
      pinyin: $('#Pinyin').val(),
      english: $('#English').val(),
      confidence: parseFloat($('#Confidence').val())
    });
  }

  prompt(text) {
    $('#Overlay #Prompt').text(text);
    $('#Overlay').show();
  }
}

// -------------------------------------------------------------------------- App

class App {
	constructor() {
		this.display = new Display(this);
    this.mongodb = new Mongodb();
	}

	init() {
		if (!this.mongodb.isLoggedIn()) {
      this.display.prompt('Login in a new tab!');
		}
  }

	async autofill() {
    // TODO: only autofill if phrase is different than before
    const phrase = this.display.getPhrase();
		const characters = await this.mongodb.getCharacters(phrase.characters);

		// edit the phrase to include the new fields
		const newPhrase = phrase.autofill(characters, {
			pinyin: true,
			english: true // TODO: only fill the oens that are empty
		});

		this.display.setPhrase(newPhrase);
  }
  
  async save() {
    const phrase = this.display.getPhrase();
    await this.mongodb.savePhrase(phrase);
    // TODO: error messages and keep window open if it fails or is dupliate
    this.display.prompt('Phrase saved!');
    setTimeout(() => {
      window.close();
    }, 1000);
  }

}


// -------------------------------------------------------------------------- Main

(function () {
	const app = new App();
	app.init();
})();
