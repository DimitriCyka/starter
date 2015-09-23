while :
do
	echo "Building..."
	bash build.sh
	echo "Running"
	build/linux64/nw
	echo "Sleeping 0.5 sec"
	sleep 0.5
done
