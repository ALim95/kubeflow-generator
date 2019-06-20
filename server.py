#!/usr/bin/env python3.6

from flask import Flask, render_template, jsonify, request
import argparse
import sys
sys.excepthook = sys.__excepthook__

arg_parser = argparse.ArgumentParser()
arg_parser.add_argument('--kfphost', help='Kubeflow Pipeline\'s IP or hostname')
arg_parser.add_argument('--mdbhost', help='ModelDB\'s IP or hostname')
args = arg_parser.parse_args()


app = Flask(__name__)

kfphost = ''
mdbhost = ''

if (args.kfphost is not ''):
	kfphost = args.kfphost+'/pipeline'

if (args.mdbhost is not ''):
	mdbhost = args.mdbhost

@app.route('/')
def index():
  return render_template('index.html', modelDB_IP=mdbhost, kfp_hostname=kfphost)

@app.route('/_test')
def test():
	code=request.args.get('a', 0, type=str)
	# print(code)
	# print(type(code))
	# exec(code)
	d = {}
	exec(code, d, d)
	return jsonify(result=code)


if __name__ == '__main__':
  app.run(debug=True)
