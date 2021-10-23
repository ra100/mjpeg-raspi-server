# mjpeg-raspi-server

> This project provides a web interface for starting and stopping the mjpeg-streamer
> over a network.

## Requirements

### Hardware

- Raspberry Pi Zero W (or other wireless RPi)
- HDMI to CSI adapter [Waveshare HDMI - CSI](https://www.waveshare.com/hdmi-to-csi-adapter.htm)

### Software

- experimental mjpg-streamer https://github.com/jacksonliam/mjpg-streamer
  - follow the intructions on how to compile and run it
- NodeJS
- Raspberry Pi with HDMI to CSI module (if you wish to use HDMI and video input)

## Installation

Install nodejs on your Raspberry Pi.

- install nvm:
  - run `curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash`
- install NodeJS:
  - on Pi Zero (armv6):
  - run `NVM_NODEJS_ORG_MIRROR=https://unofficial-builds.nodejs.org/download/release/ nvm install 17`
  - for armv7 run `nvm install 17`
- install mjpg-streamer:
  - follow the instructions on how to build: https://github.com/jacksonliam/mjpg-streamer#building--installation
- checkout this repository and build the project:

  - run:

    ```shell
    git clone https://github.com/ra100/mjpeg-raspi-server.git
    cd mjpeg-raspi-server
    npm install
    npm run build
    npm start
    ```

## How to run

Specify path to mjpg-camera build and run:

```shell
export MJPEG_CAMERA_PATH=/home/pi/mjpg-streamer/mjpg-streamer-experimental
npm start
```

or

```shell
MJPEG_CAMERA_PATH=/home/pi/mjpg-streamer/mjpg-streamer-experimental npm start
```

To have it automatically start on boot:

- modify `mjpeg.service` to match your configuration -> node path and mjpg-streamer path
- `sudo make service`
- `sudo systemctl start mjpeg.service`

## How to prepare your Raspberry Pi

- Flash Raspberry Pi OS Lite on the SD card
- Update `/boot/config.txt` to enable HDMI and enable camera
  - add/uncomment:
    ```
    dtparam=i2c_arm=on
    gpu_mem=256
    start_x=1
    ```
- enable and configure WiFi in `/etc/wpa_supplicant/wpa_supplicant.conf`

  - create or edit the file

    ```
    ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
    update_config=1
    country=GB

    network={
      ssid="your-ssid"
      psk="your-password"
    }
    ```

- add empty `ssh` file to `/boot/` - this enables SSH on boot
- start the Raspberry Pi
- SSH to your RPi
- enable camera via `sudo raspi-config`
- reboot
- check camera is detected and working `vcgencmd get_camera`
- install git `sudo apt install git`
- continue with "Installation" steps

## Thanks

- https://medium.com/home-wireless/headless-streaming-video-with-the-raspberry-pi-zero-w-and-raspberry-pi-camera-38bef1968e1
