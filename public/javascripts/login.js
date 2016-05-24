$('#login_dropdown_select').on('click', 'a', function () {
	if (this.text.indexOf('Wargaming') != -1) {
		var form = $("<form action='/auth/openid' method='POST'><input type='hidden' name='openid_identifier' value='"+ this.id +"' /></form>");
		$('body').append(form);
		form.submit();
	} else if (this.text.indexOf('Google') != -1) {
		var form = $("<form action='/auth/google' method='POST'></form>");
		$('body').append(form);
		form.submit();
	} else if (this.text.indexOf('VK') != -1) {
		var form = $("<form action='/auth/vk' method='POST'></form>");
		$('body').append(form);
		form.submit();
	} else if (this.text.indexOf('Facebook') != -1) {
		var form = $("<form action='/auth/facebook' method='POST'></form>");
		$('body').append(form);
		form.submit();
	} else if (this.text.indexOf('Steam') != -1) {
		var form = $("<form action='/auth/steam' method='POST'></form>");
		$('body').append(form);
		form.submit();
	} else if (this.text.indexOf('Battle.net') != -1) {
		var form = $("<form action='/auth/battlenet' method='POST'></form>");
		$('body').append(form);
		form.submit();
	} else if (this.text.indexOf('Twitter') != -1) {
		var form = $("<form action='/auth/twitter' method='POST'></form>");
		$('body').append(form);
		form.submit();			
	}
});