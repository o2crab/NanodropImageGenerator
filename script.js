document.getElementById('tsvFile').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        const lines = event.target.result.split('\n');
        const samples = {};
        let currentSample = null;
        let recording = false;

        lines.forEach(line => {
            line = line.trim();
            if (line.startsWith('Sample')) {
                currentSample = line;
                samples[currentSample] = { x: [], y: [] };
                recording = false;
            } else if (line === '//QSpecEnd:') {
                recording = true;
            } else if (recording && line.includes('\t')) {
                const [wl, ab] = line.split('\t');
                const wavelength = parseFloat(wl);
                const absorbance = parseFloat(ab);
                if (!isNaN(wavelength) && !isNaN(absorbance)) {
                    samples[currentSample].x.push(wavelength);
                    samples[currentSample].y.push(absorbance);
                }
            }
        });

        const container = document.getElementById('plots');
        container.innerHTML = ''; // Clear previous plots

        const plotIds = [];

        Object.entries(samples).forEach(([sampleName, values], index) => {
            const div = document.createElement('div');
            const plotId = `plot-${index}`;
            div.id = plotId;
            container.appendChild(div);
            plotIds.push(plotId);

            Plotly.newPlot(plotId, [{
                x: values.x,
                y: values.y,
                mode: 'lines',
                name: sampleName
            }], {
                title: {
                    text: sampleName
                },
                xaxis: { title: 'Wavelength (nm)' },
                yaxis: { title: 'Absorbance' },
                margin: { t: 40 },
                font: {
                    size: 18
                }
            }, { responsive: true });
        });

        // Show download button
        const downloadBtn = document.getElementById('downloadPdfBtn');
        downloadBtn.style.display = 'inline-block';

        downloadBtn.onclick = async () => {
            const filename = file.name.substring(0, file.name.indexOf('.'));
            const { jsPDF } = window.jspdf;
            let pdf = new jsPDF('portrait', 'mm', 'a4');
            pdf.setFontSize(12);
            const width = 65;
            const height = 65;
            let margin = 6;
            let horizontalSpace = 1;
            let verticalSpace = 4;
            let fontHeight = 6;

            pdf.text(filename, margin, margin);

            for (let i = 0; i < plotIds.length; i++) {
                const plotId = plotIds[i];
                const imgData = await Plotly.toImage(plotId, { format: 'png', width: 800, height: 600 });
                if (i > 0 && i % 12 == 0) {
                    pdf.addPage();
                    pdf.text(filename, margin, margin);
                }
                const xOffset = margin + (width + horizontalSpace) * ((i%12) % 3);
                const yOffset = margin + fontHeight + (height + verticalSpace) * Math.floor((i%12) / 3);
                pdf.addImage(imgData, 'PNG', xOffset, yOffset, width, height);
            }

            pdf.save(filename + '.pdf');
        };
    };

    reader.readAsText(file);
});
