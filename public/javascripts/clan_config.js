$(document).ready(function() {
	$("#recalculate").click(function() {
		$.post("/recalculate").done(function( data ) {
			var multipliers = {};
			multipliers.CW = [parseFloat($("#CW6").val()), parseFloat($("#CW8").val()), parseFloat($("#CW10").val())]
			multipliers.CWW = parseFloat($("#CWW").val());
			multipliers.CWL = parseFloat($("#CWL").val());
			multipliers.SH = [parseFloat($("#SH6").val()), parseFloat($("#SH8").val()), parseFloat($("#SH10").val())]
			multipliers.SHW = parseFloat($("#SHW").val());
			multipliers.SHL = parseFloat($("#SHL").val());
			multipliers.SK = [parseFloat($("#SK6").val()), parseFloat($("#SK8").val()), parseFloat($("#SK10").val())]
			multipliers.SKW = parseFloat($("#SKW").val());
			multipliers.SKL = parseFloat($("#SKL").val());
			multipliers.A = parseFloat($("#A").val());
			var treasury = parseInt($("#treasury").val());
			$.post("/recalculate", {treasury: treasury, multipliers: multipliers}).done(function( data ) {
			  //alert($("meta[name='update_message']").attr('content'));
			  window.location.reload();
			});
		});	
	});
	
	$("#reset_interval").click(function() {
		var r = confirm($("meta[name='reset_interval_warning']").attr('content'));
		if (r == true) {
			$.post("/reset").done(function( data ) {
				alert($("meta[name='reset_interval_confirm']").attr('content'));
			});	
		}
	});
});