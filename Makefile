.DEFAULT_GOAL: all

all:
	make build
	make service

build:
	npm install
	npm run build

service:
	cp mjpeg.service /etc/systemd/system/
	systemctl enable mjpeg.service
