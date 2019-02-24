var requisitions = {};
requisitions.setGame = (req, res, game) => {
  req.session.game = game;
  res.cookie('game', game, { maxAge: 30 * 3600 * 1000, domain: requisitions.getHost(req) });
};

requisitions.setLocale = (req, res, locale) => {
  req.session.locale = locale;
  res.cookie('locale', locale, { maxAge: 30 * 3600 * 1000, domain: requisitions.getHost(req) });
};

requisitions.createAnonymousUser = (req) => {
  if (!req.session.passport) {
    req.session.passport = {};
  }
  req.session.passport.user = {};
  req.session.passport.user.id = newUid();
  req.session.passport.user.name = "Anonymous";
};

//returns host without subdomain
requisitions.getHost = (req) => {
  var host = req.hostname.split('.');
  if (host.length >= 2) {
    host = host[host.length - 2] + '.' + host[host.length - 1];
  } else {
    host = host[0];
  }
  return host;
};

module.exports = requisitions;