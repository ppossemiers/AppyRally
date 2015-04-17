cordova build --release android
keytool -genkey -v -keystore my-release-key.keystore -alias alias_name -keyalg RSA -keysize 2048 -validity 10000
mv ./platforms/android/ant-build/CordovaApp-release-unsigned.apk .
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore my-release-key.keystore CordovaApp-release-unsigned.apk alias_name
zipalign -v 4 CordovaApp-release-unsigned.apk AppyRally.apk
rm CordovaApp-release-unsigned.apk
rm my-release-key.keystore