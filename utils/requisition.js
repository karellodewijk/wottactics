var requisition = {};
requisition.setGame = (req, res, game) => {
  req.session.game = game;
  res.cookie('game', game, { maxAge: 30 * 3600 * 1000, domain: requisition.getHost(req) });
};

requisition.setLocale = (req, res, locale) => {
  req.session.locale = locale;
  res.cookie('locale', locale, { maxAge: 30 * 3600 * 1000, domain: requisition.getHost(req) });
};

requisition.createAnonymousUser = (req) => {
  if (!req.session.passport) {
    req.session.passport = {};
  }
  req.session.passport.user = {};
  req.session.passport.user.id = requisition.newUid();
  req.session.passport.user.name = "Anonymous";
};

requisition.newUid = () => {
  const constants = require("./constants");
  const validChars = constants.ValidChars;
	var text = "";
	for (var i = 0; i < 14; i++) {
		text += validChars.charAt(Math.floor(Math.random() * validChars.length));
	}
	return text;
}

//returns host without subdomain
requisition.getHost = (req) => {
  var host = req.hostname.split('.');
  if (host.length >= 2) {
    host = host[host.length - 2] + '.' + host[host.length - 1];
  } else {
    host = host[0];
  }
  return host;
};

module.exports = requisition;