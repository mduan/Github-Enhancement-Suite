all:
	jsx js/src/ js/build/

watch:
	# jsx -w js/src/ js/build/
	while true; do make all; sleep 2; done

build: all
	mkdir -p build/
	zip -r build/Github-Enhancement-Suite.zip manifest.json img/ css/ js/build/ js/ext/ -x *.module-cache*

clean:
	rm -rf js/build/
	rm -rf build/
