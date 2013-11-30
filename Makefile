all:
	jsx js/src/ js/build/

watch:
	# jsx -w js/src/ js/build/
	while true; do make all; sleep 2; done

build: all
	mkdir -p build/
	zip -r build/Github-Enhancement-Suite.zip img css js/build/*.js manifest.json

clean:
	rm -rf js/build/
	rm -rf build/
