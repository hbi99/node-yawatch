
var path = require('path');

exports.eventProxy = eventProxy

function eventProxy(p, callback) {
  var monitor = this;

	this.reset();
	this.stat(p, function(err) {
		if(err) throw err;

		var stack1 = {},
			stack2 = {},
			evalTimeout = false,
			evalTime = 200,
			evalStack = function() {
				var oTrans,
					transaction;

				for (transaction in stack1) {
					oTrans = stack1[transaction];
					
					if (oTrans.remove && oTrans.create) {
						callback('move', oTrans.remove.path, oTrans.create.path);
						delete stack1[transaction];
						delete stack2[oTrans.remove.dirName];
						delete stack2[oTrans.create.dirName];
					}
				}
				for (transaction in stack2) {
					oTrans = stack2[transaction];

					if (oTrans.remove && oTrans.create) {
						callback('move', oTrans.remove.path, oTrans.create.path);
						delete stack1[oTrans.remove.st1Name];
						delete stack1[oTrans.create.st1Name];
					} else if (oTrans.remove && !oTrans.create) {
						callback('remove', oTrans.remove.path);
						delete stack1[oTrans.remove.st1Name];
					} else if (!oTrans.remove && oTrans.create) {
						callback('create', oTrans.create.path);
						delete stack1[oTrans.create.st1Name];
					} else if (oTrans.change) {
						callback('change', oTrans.change.path);
					}
					delete stack2[transaction];
				}
			};

		monitor.on('*', function(type, p, currStat, prevStat) {
			var isDir = currStat.isDirectory(),
				dirName = path.dirname(p),
				baseName = path.basename(p),
				st1Name = baseName +':'+ currStat.size +':'+ currStat.ctime;

			clearTimeout(evalTimeout);
			evalTimeout = setTimeout(evalStack, evalTime);

			if (!stack1[st1Name]) stack1[st1Name] = {};
			if (!stack2[dirName]) stack2[dirName] = {};

			switch(type) {
				case 'change':
					if (!isDir) {
						stack2[dirName].change = {
							path: p
						};
					}
					break;
				case 'remove':
					stack1[st1Name].remove = {
						path: p,
						dirName: dirName
					};
					stack2[dirName].remove = {
						path: p,
						st1Name: st1Name
					};
					break;
				case 'create':
					stack1[st1Name].create = {
						path: p,
						dirName: dirName
					};
					stack2[dirName].create = {
						path: p,
						st1Name: st1Name
					};
					break;
			}

		});
	});
}
