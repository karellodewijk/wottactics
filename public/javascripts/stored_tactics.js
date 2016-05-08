var servers = ['server1.wottactic.eu']
//var servers = ['localhost']

function escape(s) {
	return ('' + s)
		.replace(/\\/g, '\\\\')
		.replace(/\t/g, '\\t')
		.replace(/\n/g, '\\n')
		.replace(/\u00A0/g, '\\u00A0')
		.replace(/&/g, '\\x26')
		.replace(/'/g, '\\x27')
		.replace(/"/g, '\\x22')
		.replace(/</g, '\\x3C')
		.replace(/>/g, '\\x3E')
		;
}

$(document).ready(function() {

	$('#tactic_list').on('click', '.share_tactic', function (e) {
		var textArea = document.createElement("textarea");
		var link_text = $(this).attr('data-link');
		textArea.value = link_text;
		document.body.appendChild(textArea);
		//textArea.select();
		window.prompt("Share tactic link:", link_text);
		document.body.removeChild(textArea);
	});
	
	var link_uid;
	$('#modal_cancel').click(function (e) {
		$('#myModal').modal('hide');
	});
	
	$('#link_send').click(function (e) {
		var link = $('#send_link').val();
		var i = link.indexOf('room=');
		if (i == -1) {
			alert("No room id found in link.");
		} else {
			function hashstring(str) {
				var sum = 0;
				for (i = 0; i < str.length; i++) {
					sum += str.charCodeAt(i);
				}
				return (sum % 3);
			}
			tactic_uid = link.slice(i+5).split('&')[0];
			var nr = hashstring(tactic_uid);
			var target = servers[hashstring(tactic_uid) % servers.length];
			
			function parse_domain(domain) {
				var subDomain = domain.split('.');	
				if (subDomain.length > 2) {
					subDomain = subDomain.slice(1);
				}
				return '.' + subDomain.join('.')
			}

			$.post('http://'+target+'/add_to_room', {target: tactic_uid, source:link_uid, session_id:$("#sid").attr("data-sid"), host:parse_domain(location.hostname), stored:"true"}).done(function( data ) {
				if (data != "Success") {
					alert(data);
				}
		    });
		}
		
		$('#myModal').modal('hide');
	});
	
	$('#tactic_list').on('click', '.send_to_link', function (e) {
		$('#myModal').modal('show');
		link_uid = $(this).attr('data-uid');	
		$('#myModal').on('shown.bs.modal', function () {
			$("#send_link").focus();
		});
	});
	
	$('#tactic_list').on('click', '.share_link', function (e) {
		$('#myModal').modal('show');
		link_uid = $(this).attr('data-uid');	
		$('#myModal').on('shown.bs.modal', function () {
			$("#send_link").focus();
		});
	});
	
	$('#tactic_list').on('click', '.btn-danger', function (e) {
		if ($(this).hasClass('btn-danger')) {
			var r = confirm("Are you sure you want to remove this tactic ?");
			if (r == true) {
				$.post('/remove_tactic', {id: $(this).attr('data-uid')});
				var node = $("#tactic_list").treetable("node", $(this).parent().parent().attr('data-tt-id'));
				$("#tactic_list").treetable("unloadBranch", node);
				$("tr[id='" + $(this).attr('data-uid') + "']").remove();
			}
		}
	})
	
	function notify(text) {
		$("#notification").html(text);
		$("#notification_box").css('visibility','visible');
		setTimeout(function() {
			$("#notification_box").css('visibility','hidden');
		}, 5000);		
	}
	
	$('#create_folder').click(function(){
		var path = $('#new_form_name').val();
		
		if (path == "") {
			notify("<font color='red'>" + $('#extra_data').attr('data-error_empty_folder') + "</font>")
			return;					
		}			
		if ($("#tactic_list tbody tr[data-tt-id='" + path + "']").length) {
			notify("<font color='red'>" + $('#extra_data').attr('data-error_map_exist') + "</font>")
			return;
		}
		
		var temp = $("<tr class='folder' data-tt-id=''><td><div class='inline icon icon-folder'></div>&nbsp;" + escape(path) + "</td><td></td><td></td><td></td><td></td><td></td></tr>");

		$("#tactic_list tbody").append(temp);
		var node = $("#tactic_list tbody tr").last();
		node.attr('data-tt-id', escape(path));
		
		$("#tactic_list").treetable("loadBranch", null, node);
		
		//var node = $('#'+path);
		make_draggable(node);
		make_dropable(node);
		
		notify($('#extra_data').attr('data-warning_empty_folter'));
	})
	
	$(".date").each(function () {
	  $(this).html(new Date(parseInt($(this).text())).toLocaleString()); 
	});		
	
	function create_folder_if_not_exists(path, parent) {
		if (path == "")	return;
		var res = path.split('/');
		var path;
		if (parent != "") {
			path = parent + "/" + res[0];
		} else {
			path = res[0];
		}
		if (!$("#tactic_list tbody tr[data-tt-id='" + path + "']").length) {
			if (parent != "") {
				$("#tactic_list tbody").append("<tr class='folder' data-tt-parent-id='"+ parent +"' data-tt-id='"+ path + "'><td><div class='inline icon icon-folder'></div>&nbsp;" + res[0] + "</td><td></td><td></td><td></td><td></td><td></td></tr>");
			} else {
				$("#tactic_list tbody").append("<tr class='folder' data-tt-id='"+ path + "'><td><div class='inline icon icon-folder'></div>&nbsp;" + res[0] + "</td><td></td><td></td><td></td><td></td><td></td></tr>");						
			}
		}
		create_folder_if_not_exists(res.slice(1).join("/"), path);
	}
	
	$("#tactic_list tbody tr").each(function(){
		if ($(this).attr("data-tt-parent-id")) {
			var parent_path = $(this).attr('data-tt-parent-id');
			create_folder_if_not_exists(parent_path, "");
		}
	});
	
	function sort_nodes() {
		var options = $("#tactic_list tbody tr").sort(function(a,b) {
			if ( $(a).attr("data-tt-id") < $(b).attr("data-tt-id") )
			  return -1;
			if ( $(a).attr("data-tt-id") > $(b).attr("data-tt-id") )
			  return 1;
			return 0;
		});
		$("#tactic_list tbody").empty().append(options); //ie fix no-op			
	}
	
	sort_nodes();
	$("#tactic_list").treetable({ expandable: true });

	// Highlight selected row
	$("#tactic_list tbody").on("mousedown", "tr", function() {
	  $(".selected").not(this).removeClass("selected");
	  $(this).toggleClass("selected");
	});

	function make_draggable(node) {
		node.draggable({
		  helper: "clone",
		  opacity: .75,
		  refreshPositions: true,
		  revert: "invalid",
		  revertDuration: 300,
		  scroll: true
		});
	}
	
	function move(node, path) {
		var old_path = node.attr('data-tt-id');
		var res = old_path.split('/');
		var file_name = res[res.length-1];

		var new_path;
		if (path != "") {
			new_path = path + '/' + file_name;				
		} else {
			new_path = file_name;
		}


		
		if (node.hasClass('file')) {
			$.post('/rename_tactic', {uid: node.attr('id'), new_name:new_path});
		} else if (node.hasClass('folder')) {
			$("#tactic_list tbody tr[data-tt-parent-id='" + old_path + "']").each(function(){
				move($(this), new_path);
			});
		}

		//Well, jquery.treetable didn't handle duplicate names very well, even when in diff dirs.
		//Basically the following code makes sure the data-tt-id always contains the fully qualified path
		//but I had to dig a little bit into the treetable api to line everything up apropriately
		
		node.attr('data-tt-id', new_path);
		node.attr('data-tt-parent-id', path);	
		var tree = $("#tactic_list").treetable().data("treetable").tree;
		tree[new_path] = tree[old_path];				
		tree[new_path].id = new_path;
		tree[new_path].parentId = path;
		tree[new_path].row.data("ttId", new_path);
-		delete tree[old_path];	
	}

	function make_dropable(node) {
		node.droppable({
			accept: ".file, .folder",
			drop: function(e, ui) {
			  var droppedEl = ui.draggable;

				var path = $(this).attr('data-tt-id');
				var old_path = droppedEl.attr('data-tt-id');
				var res = old_path.split('/');
				var file_name = res[res.length-1];

				var new_path;
				if (path != "") {
					new_path = path + '/' + file_name;
				} else {
					new_path = file_name;
				}
				
				if ($("#tactic_list tbody tr[data-tt-id='" + new_path + "']").length) {
					notify("<font color='red'>" + $('#extra_data').attr('data-error_map_exists') + "</font>");
					return;
				}
			  
				$("#tactic_list").treetable("move", droppedEl.data("ttId"), $(this).data("ttId"));
				move(droppedEl, $(this).attr('data-tt-id'));
				
			  
			},
			hoverClass: "accept",
			over: function(e, ui) {
			  var droppedEl = ui.draggable;
			  if(this != droppedEl[0] && !$(this).is(".expanded")) {
				$("#tactic_list").treetable("expandNode", $(this).data("ttId"));
			  }
			}
		});
	}

	$("#tactic_list .file, #tactic_list .folder").each( function() {
		make_draggable($(this));
	});

	$("#tactic_list .folder").each(function() {
		make_dropable($(this));
	});
}); 	