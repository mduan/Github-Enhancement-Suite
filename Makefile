all:
	jsx js/src/ js/build/

watch:
	# jsx -w js/src/ js/build/
	while true; do make all; sleep 2; done

clean:
	rm -rf js/build/
