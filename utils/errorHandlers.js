
module.exports = {

  setErrorHandler: (app) => {
    var isDevelopmentEnvironment = app.get('env') === 'development';
    app.use(function (err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: isDevelopmentEnvironment ? err : {}
      });
    });
  }
}