all:
	jsx js/src/ js/build/

loop:
	while true; do make all; sleep 2; done

clean:
	rm -r js/build/
