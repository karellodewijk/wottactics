const passport = require('passport');

var createAnonymousUser = (requisition) => {
  if (!requisition.session.passport) {
    requisition.session.passport = {};
  }
  requisition.session.passport.user = {};
  requisition.session.passport.user.id = newUid();
  requisition.session.passport.user.name = "Anonymous";
}