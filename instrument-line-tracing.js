#!/usr/bin/env node

// Copyright (C) 2015 by Yuri Victorovich. All rights reserved.

const esprima = require('esprima')
const escodegen = require('escodegen')
const stripShebang = require('strip-shebang');
const fs = require("fs");

var traceTextLine    = '__lineTracer__();';
var traceStmtRequire = esprima.parse('__lineTracer__ = require(\'__lineTracer__\')')
var traceStmtLine    = esprima.parse(traceTextLine)

function printCodeAsJson(code) {
  return JSON.stringify(code, null, 4)
}

function printCodeAsJs(code) {
  return escodegen.generate(code)
}

function addLogToArr(arr) {
  for (var i = 0, iz = arr.length, cnt = 0; i <= iz; i++) {
    arr.splice(i+cnt, 0, traceStmtLine);
    cnt++
  }
}

function instrumentStmt(stmt) {
  var done = false;
  //console.log('---> Stmt type='+stmt.type+" : "+printCodeAsJs(stmt))
  //console.log('---> Stmt - '+stmt.type)
  if (stmt.type==='BlockStatement') {
    for (var i = 0, iz = stmt.body.length; i < iz; ++i)
      instrumentStmt(stmt.body[i])
    addLogToArr(stmt.body)
    done = true
  } else if (stmt.type==='BreakStatement') {
    // nothing
    done = true
  } else if (stmt.type==='ContinueStatement') {
    // nothing
    done = true
  } else if (stmt.type==='ClassBody') {
  } else if (stmt.type==='ClassDeclaration') {
  } else if (stmt.type==='DirectiveStatement') {
  } else if (stmt.type==='DoWhileStatement') {
    instrumentExpr(stmt.test)
    done = true
  } else if (stmt.type==='CatchClause') {
  } else if (stmt.type==='DebuggerStatement') {
    // nothing
    done = true
  } else if (stmt.type==='EmptyStatement') {
    // nothing
    done = true
  } else if (stmt.type==='ExportDeclaration') {
  } else if (stmt.type==='ExportDefaultDeclaration') {
  } else if (stmt.type==='ExportNamedDeclaration') {
  } else if (stmt.type==='ExpressionStatement') {
    instrumentExpr(stmt.expression)
    done = true
  } else if (stmt.type==='ImportDeclaration') {
  } else if (stmt.type==='VariableDeclarator') {
    if (stmt.init) {
      instrumentExpr(stmt.id)
      instrumentExpr(stmt.init)
    }
    instrumentExpr(stmt.id)
    done = true
  } else if (stmt.type==='VariableDeclaration') {
    for (var i = 0, iz = stmt.declarations.length; i < iz; ++i)
      instrumentStmt(stmt.declarations[i])
    done = true
  } else if (stmt.type==='ThrowStatement') {
    instrumentExpr(stmt.argument)
    done = true
  } else if (stmt.type==='TryStatement') {
    if (stmt.handlers) {
      // old interface
      for (var i = 0, iz = stmt.handlers.length; i < iz; ++i) {
        instrumentStmt(stmt.handlers[i].body)
      }
    } else {
      // TODO
    }
    done = true
  } else if (stmt.type==='SwitchStatement') {
    instrumentExpr(stmt.discriminant)
    done = true
  } else if (stmt.type==='SwitchCase') {
    instrumentExpr(stmt.test)
    done = true
  } else if (stmt.type==='IfStatement') {
    instrumentExpr(stmt.test)
    if (stmt.alternate) {
      instrumentBlockMaybe(stmt.consequent)
      if (stmt.alternate.type==='IfStatement') {
        instrumentStmt(stmt.alternate)
      } else {
        instrumentBlockMaybe(stmt.alternate)
      }
    } else {
      instrumentBlockMaybe(stmt.consequent)
    }
    done = true
  } else if (stmt.type==='ForStatement') {
    if (stmt.init) {
      if (stmt.init.type==='VariableDeclaration')
        instrumentStmt(stmt.init)
      else
        instrumentExpr(stmt.init)
    }
    if (stmt.test)
      instrumentExpr(stmt.test)
    if (stmt.update)
      instrumentExpr(stmt.update)
    instrumentBlockMaybe(stmt.body)
    done = true
  } else if (stmt.type==='ForInStatement') {
    instrumentIterationForStatement('in', stmt)
    done = true
  } else if (stmt.type==='ForOfStatement') {
    instrumentIterationForStatement('of', stmt)
    done = true
  } else if (stmt.type==='LabeledStatement') {
    instrumentBlockMaybe(stmt.body)
    done = true
  } else if (stmt.type==='Program') {
    console.log("PROGRAM: "+escodegen.generate(stmt))
    throw new Error("Program element not expected: "+escodegen.generate(stmt))
  } else if (stmt.type==='FunctionDeclaration') {
    instrumentFuncBody(stmt)
    done = true
  } else if (stmt.type==='ReturnStatement') {
    // nothing
    done = true
  } else if (stmt.type==='WhileStatement') {
    instrumentExpr(stmt.test)
    instrumentBlockMaybe(stmt.body)
    done = true
  } else if (stmt.type==='WithStatement') {
    instrumentExpr(stmt.object)
    instrumentBlk(stmt.body)
    done = true
  } else {
    throw new Error("Unknown statement type="+stmt.type);
  }
  if (!done)
    console.log('<--- (NOT DONE) Stmt - '+stmt.type)
  //console.log('<--- Stmt '+stmt.type)
}

function instrumentExpr(expr) {
  var done = false;
  //console.log('---> Expr type='+expr.type+" : "+printCodeAsJs(expr))
  //console.log('---> Expr - '+expr.type)
  if (expr.type==='SequenceExpression') {
    for (var i = 0, iz = expr.expressions.length; i < iz; ++i)
      instrumentExpr(expr.expressions[i])
    done = true
  } else if (expr.type==='AssignmentExpression') {
    instrumentExpr(expr.right);
    done = true
  } else if (expr.type==='ArrowFunctionExpression') {
    instrumentFuncBody(expr);
    done = true
  } else if (expr.type==='ConditionalExpression') {
    instrumentExpr(expr.test)
    instrumentExpr(expr.consequent)
    instrumentExpr(expr.alternate)
    done = true
  } else if (expr.type==='LogicalExpression') {
    instrumentExpr(expr.left);
    done = true
    instrumentExpr(expr.right);
  } else if (expr.type==='BinaryExpression') {
    instrumentExpr(expr.left);
    instrumentExpr(expr.right);
    done = true
  } else if (expr.type==='CallExpression') {
    instrumentExpr(expr.callee);
    for (var i = 0, iz = expr['arguments'].length; i < iz; ++i)
      instrumentExpr(expr['arguments'][i])
    done = true
  } else if (expr.type==='NewExpression') {
    instrumentExpr(expr.callee)
    for (var i = 0, iz = expr['arguments'].length; i < iz; ++i)
      instrumentExpr(expr['arguments'][i])
    done = true
  } else if (expr.type==='MemberExpression') {
      instrumentExpr(expr.object)
      if (expr.computed)
        instrumentExpr(expr.property)
    done = true
  } else if (expr.type==='UnaryExpression') {
    instrumentExpr(expr.argument)
    done = true
  } else if (expr.type==='YieldExpression') {
    if (expr.argument)
      instrumentExpr(expr.argument)
    done = true
  } else if (expr.type==='AwaitExpression') {
    instrumentExpr(expr.argument)
    done = true
  } else if (expr.type==='UpdateExpression') {
    instrumentExpr(expr.argument)
    done = true
  } else if (expr.type==='FunctionExpression') {
    instrumentFuncBody(expr)
    done = true
  } else if (expr.type==='ExportBatchSpecifier') {
  } else if (expr.type==='ArrayPattern') {
  } else if (expr.type==='ArrayExpression') {
    for (var i = 0, iz = expr.elements.length; i < iz; ++i)
      instrumentExpr(expr.elements[i])
    done = true
  } else if (expr.type==='RestElement') {
  } else if (expr.type==='ClassExpression') {
  } else if (expr.type==='MethodDefinition') {
  } else if (expr.type==='Property') {
    if (expr.kind === 'get' || expr.kind === 'set')
      instrumentFuncBody(expr.value)
    else if (expr.method)
      instrumentFuncBody(expr.value)
    done = true
  } else if (expr.type==='ObjectExpression') {
    for (var i = 0, iz = expr.properties.length; i < iz; ++i)
      instrumentExpr(expr.properties[i])
    done = true
  } else if (expr.type==='ObjectPattern') {
    for (var i = 0, iz = expr.properties.length; i < iz; ++i)
      instrumentExpr(expr.properties[i])
    done = true
  } else if (expr.type==='ThisExpression') {
    // nothing
    done = true
  } else if (expr.type==='Super') {
    // nothing
    done = true
  } else if (expr.type==='Identifier') {
    // nothing
    done = true
  } else if (expr.type==='ImportDefaultSpecifier') {
  } else if (expr.type==='ImportNamespaceSpecifier') {
  } else if (expr.type==='ImportSpecifier') {
  } else if (expr.type==='ExportSpecifier') {
  } else if (expr.type==='Literal') {
    // nothing
    done = true
  } else if (expr.type==='GeneratorExpression') {
  } else if (expr.type==='ComprehensionExpression') {
  } else if (expr.type==='ComprehensionBlock') {
  } else if (expr.type==='SpreadElement') {
  } else if (expr.type==='TaggedTemplateExpression') {
  } else if (expr.type==='TemplateElement') {
  } else if (expr.type==='TemplateLiteral') {
  } else if (expr.type==='ModuleSpecifier') {
  } else {
    throw new Error("Unknown expresion type="+expr.type);
  }
  if (!done)
    console.log('<--- (NOT DONE) Expr - '+expr.type)
  //console.log('<--- Expr '+expr.type)
}

function instrumentIterationForStatement(operator, stmt) {
  if (stmt.left.type === 'VariableDeclaration')
    instrumentStmt(stmt.left.declarations[0])
  else
    instrumentExpr(stmt.left)
  instrumentExpr(stmt.right)
  instrumentBlockMaybe(stmt.body)
}

function instrumentFuncBody(node) {
  if (node.expression)
    instrumentExpr(node.body)
  else
    instrumentBlockMaybe(node.body)
}

function instrumentBlockMaybe(stmt) {
  instrumentStmt(stmt)
}

function instrumentDive(codeArr) {
  for (var i = 0, ie = codeArr.length; i<ie; i++)
    instrumentStmt(codeArr[i])
}

function instrumentTopLevel(codeProg) {
  instrumentDive(codeProg.body)
  //instrumentArr(codeProg.body)
  // add require stmt
  codeProg.body.unshift(traceStmtRequire)
  //
  return codeProg
} 
//function instrStr(jsStr) {
//  console.log('=====>\n'+escodegen.generate(instrumentTopLevel(esprima.parse(jsStr)))+'\n<=====');
//}

function addShebang(str) {
  return "#!/usr/bin/env node\n"+str;
}

function insertLocations(file, str) {
  var lines = str.split("\n");
  var res = '';
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line.replace(/ /g,'')==traceTextLine)
      line = '__lineTracer__(\''+file+'\','+(i+1)+');';
    res = res + line + '\n';
  }
  return res;
}

function instrumentFile(fname, cbSucceeded, cbParseFailed) {
  var strOrig = fs.readFileSync(fname, "utf8")
  var strPure = stripShebang(strOrig)
  var parsed;
  try {
    parsed = esprima.parse(strPure)
  } catch(err) {
    cbParseFailed(fname, err)
    return
  }
  //
  var instrumented = escodegen.generate(instrumentTopLevel(parsed))
  // add shebang back
  if (strOrig!=strPure)
    instrumented = addShebang(instrumented)
  // replace with line numbers
  instrumented = insertLocations(fname, instrumented)
  // output
  fs.writeFile(fname, instrumented, function (err) {
    if (err) throw err;
  })
  cbSucceeded(fname);
}

function listJsFilesL(dir, lst) {
  fs.readdirSync(dir).forEach(function(file) {
    file = dir+'/'+file
    var stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      listJsFilesL(file,lst)
    } else if (file.endsWith(".js")) {
      lst.push(file)
    }
  })
}

function listJsFiles(dir) {
  var files = []
  listJsFilesL(dir, files)
  return files
}

function instumentProject(dir) {
  // instrument js files
  var files = listJsFiles(dir);
  var cntSucc = 0, cntFail = 0;
  for (var i = 0; i < files.length; i++)
    instrumentFile(files[i], function(fname) {
      cntSucc++;
    }, function(fname, err) {
      console.error("ERROR: failed to parse js file "+fname+' ('+err.toString()+')')
      cntFail++;
    });
  // add __lineTracer__.js
  fs.createReadStream('__lineTracer__.js').pipe(fs.createWriteStream(dir+"/node_modules/__lineTracer__.js"));
  // report
  if (cntFail==0) {
    console.log('instrumented '+cntSucc+' js files');
  } else {
    console.log('instrumented '+cntSucc+' js files, failed '+cntFail+' files');
  }
}

// for testing

//
// MAIN: instrument the project directory
//

instumentProject(process.argv[2])
